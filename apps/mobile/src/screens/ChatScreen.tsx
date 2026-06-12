import React, { useEffect, useRef, useState } from "react";
import {
  Alert,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { Channel, StreamChat } from "stream-chat";
import { ChatCredentials } from "@tomatina/protocol";
import { GAME_SERVER_HTTP_URL } from "../config";
import { supabase } from "../lib/supabase";
import { colors } from "../theme";

interface Message {
  id: string;
  text: string;
  mine: boolean;
  /** Moderated image, delivered pull-based: shown only after a tap. */
  imageUrl?: string;
}

interface Props {
  /** The revealed opponent name. */
  title: string;
  /** Stream credentials from the mutual reveal; null = local fallback. */
  chat: ChatCredentials | null;
  onClose: () => void;
}

/**
 * Post-reveal chat. Backed by a Stream channel created at mutual consent;
 * falls back to a local-only thread when Stream isn't configured yet.
 * Media upload (with moderation) is the next Phase 2 brick — text only
 * for now, which also keeps the moderation invariant trivially satisfied.
 */
export function ChatScreen({ title, chat, onClose }: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [mediaEnabled, setMediaEnabled] = useState(false);
  const [sendingImage, setSendingImage] = useState(false);
  /** Which image messages the user chose to view (pull-based display). */
  const [opened, setOpened] = useState<Set<string>>(new Set());
  const channelRef = useRef<Channel | null>(null);
  const localId = useRef(0);

  useEffect(() => {
    if (!chat) return;
    fetch(`${GAME_SERVER_HTTP_URL}/media/status`)
      .then((r) => r.json())
      .then((s: { enabled?: boolean }) => setMediaEnabled(!!s.enabled))
      .catch(() => {});
  }, [chat]);

  useEffect(() => {
    if (!chat) return;
    const client = StreamChat.getInstance(chat.apiKey);
    let cancelled = false;

    const connect = async () => {
      await client.connectUser({ id: chat.userId }, chat.token);
      const channel = client.channel("messaging", chat.channelId);
      await channel.watch();
      if (cancelled) return;
      channelRef.current = channel;
      const toMessage = (m: {
        id: string;
        text?: string;
        user?: { id?: string } | null;
        attachments?: { type?: string; image_url?: string }[];
      }): Message => ({
        id: m.id,
        text: m.text ?? "",
        mine: m.user?.id === chat.userId,
        imageUrl: m.attachments?.find((a) => a.type === "image")?.image_url,
      });
      setMessages(channel.state.messages.map(toMessage));
      channel.on("message.new", (event) => {
        const m = event.message;
        if (!m) return;
        setMessages((prev) =>
          prev.some((x) => x.id === m.id) ? prev : [...prev, toMessage(m)],
        );
      });
    };
    connect().catch((err) => {
      if (!cancelled) setError(err instanceof Error ? err.message : "chat error");
    });

    return () => {
      cancelled = true;
      channelRef.current = null;
      client.disconnectUser().catch(() => {});
    };
  }, [chat]);

  const send = () => {
    const text = draft.trim();
    if (!text) return;
    setDraft("");
    if (chat && channelRef.current) {
      channelRef.current.sendMessage({ text }).catch(() => {
        setError("Message not sent — connection issue.");
      });
    } else {
      localId.current += 1;
      setMessages((m) => [...m, { id: `local-${localId.current}`, text, mine: true }]);
    }
  };

  const sendImage = async () => {
    if (!chat || !supabase || sendingImage) return;
    const picked = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.7,
      allowsEditing: false,
    });
    const asset = picked.assets?.[0];
    if (picked.canceled || !asset) return;

    setSendingImage(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const { data: sessionData } = await supabase.auth.getSession();
      const userId = userData.user?.id;
      const accessToken = sessionData.session?.access_token;
      if (!userId || !accessToken) throw new Error("Sign in again.");

      // 1. quarantine upload (the only storage write the account may do)
      const path = `quarantine/${userId}/${Date.now()}.jpg`;
      const fileResp = await fetch(asset.uri);
      const fileBytes = await fileResp.arrayBuffer();
      const upload = await supabase.storage
        .from("chat-media")
        .upload(path, fileBytes, { contentType: "image/jpeg" });
      if (upload.error) throw new Error(upload.error.message);

      // 2. server: moderate, then deliver only if clean
      const resp = await fetch(`${GAME_SERVER_HTTP_URL}/media/moderate`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ path, channelId: chat.channelId }),
      });
      const result = (await resp.json()) as { allowed?: boolean; error?: string };
      if (!resp.ok) throw new Error(result.error ?? "upload failed");
      if (!result.allowed) {
        Alert.alert(
          "Image not sent",
          "Automatic moderation rejected this image. Only friendly content gets through 🍅",
        );
      }
      // delivery happens via the Stream event — nothing to append locally
    } catch (err) {
      Alert.alert("Image not sent", err instanceof Error ? err.message : "Try again.");
    } finally {
      setSendingImage(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={styles.header}>
        <Pressable onPress={onClose} hitSlop={12}>
          <Text style={styles.close}>✕</Text>
        </Pressable>
        <View>
          <Text style={styles.name}>{title}</Text>
          <Text style={styles.revealed}>
            {chat ? "revealed by mutual consent" : "revealed by mutual consent (local chat)"}
          </Text>
        </View>
      </View>

      {messages.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyEmoji}>💬</Text>
          <Text style={styles.emptyText}>
            You both said yes. Say hi — you just had a tomato fight.
          </Text>
          {error && <Text style={styles.error}>{error}</Text>}
        </View>
      ) : (
        <FlatList
          style={styles.list}
          contentContainerStyle={styles.listContent}
          data={messages}
          keyExtractor={(m) => m.id}
          renderItem={({ item }) => (
            <View style={[styles.bubble, item.mine ? styles.mine : styles.theirs]}>
              {item.imageUrl ? (
                // pull-based media (invariant 5): never shown until tapped
                opened.has(item.id) ? (
                  <Image source={{ uri: item.imageUrl }} style={styles.image} />
                ) : (
                  <Pressable
                    onPress={() => setOpened((s) => new Set(s).add(item.id))}
                  >
                    <Text style={item.mine ? styles.mineText : styles.theirsText}>
                      📷 Image — tap to view
                    </Text>
                  </Pressable>
                )
              ) : (
                <Text style={item.mine ? styles.mineText : styles.theirsText}>
                  {item.text}
                </Text>
              )}
            </View>
          )}
        />
      )}

      <View style={styles.inputRow}>
        {chat && mediaEnabled && (
          <Pressable style={styles.media} onPress={sendImage} disabled={sendingImage}>
            <Text style={styles.mediaText}>{sendingImage ? "⏳" : "📷"}</Text>
          </Pressable>
        )}
        <TextInput
          style={styles.input}
          value={draft}
          onChangeText={setDraft}
          placeholder="Message…"
          placeholderTextColor={colors.textDim}
          onSubmitEditing={send}
          returnKeyType="send"
        />
        <Pressable style={styles.send} onPress={send}>
          <Text style={styles.sendText}>Send</Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingTop: 58,
    paddingBottom: 14,
    paddingHorizontal: 18,
    backgroundColor: colors.surface,
  },
  close: { color: colors.textDim, fontSize: 20 },
  name: { color: colors.text, fontSize: 18, fontWeight: "700" },
  revealed: { color: colors.textDim, fontSize: 12 },
  empty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 36,
    gap: 10,
  },
  emptyEmoji: { fontSize: 44 },
  emptyText: { color: colors.textDim, fontSize: 15, textAlign: "center", lineHeight: 22 },
  error: { color: colors.tomato, fontSize: 13, textAlign: "center", marginTop: 8 },
  list: { flex: 1 },
  listContent: { padding: 16, gap: 8 },
  bubble: {
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 9,
    maxWidth: "80%",
  },
  mine: {
    alignSelf: "flex-end",
    backgroundColor: colors.tomato,
    borderBottomRightRadius: 4,
  },
  theirs: {
    alignSelf: "flex-start",
    backgroundColor: colors.surface,
    borderBottomLeftRadius: 4,
  },
  mineText: { color: colors.white, fontSize: 15 },
  theirsText: { color: colors.text, fontSize: 15 },
  image: { width: 200, height: 200, borderRadius: 10 },
  media: { justifyContent: "center", paddingHorizontal: 4 },
  mediaText: { fontSize: 22 },
  inputRow: {
    flexDirection: "row",
    gap: 10,
    padding: 12,
    paddingBottom: 28,
    backgroundColor: colors.surface,
  },
  input: {
    flex: 1,
    backgroundColor: colors.background,
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 10,
    color: colors.text,
    fontSize: 15,
  },
  send: {
    backgroundColor: colors.tomato,
    borderRadius: 22,
    paddingHorizontal: 18,
    justifyContent: "center",
  },
  sendText: { color: colors.white, fontWeight: "700" },
});
