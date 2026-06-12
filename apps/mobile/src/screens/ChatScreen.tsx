import React, { useEffect, useRef, useState } from "react";
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Channel, StreamChat } from "stream-chat";
import { ChatCredentials } from "@tomatina/protocol";
import { colors } from "../theme";

interface Message {
  id: string;
  text: string;
  mine: boolean;
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
  const channelRef = useRef<Channel | null>(null);
  const localId = useRef(0);

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
      setMessages(
        channel.state.messages.map((m) => ({
          id: m.id,
          text: m.text ?? "",
          mine: m.user?.id === chat.userId,
        })),
      );
      channel.on("message.new", (event) => {
        const m = event.message;
        if (!m) return;
        setMessages((prev) =>
          prev.some((x) => x.id === m.id)
            ? prev
            : [...prev, { id: m.id, text: m.text ?? "", mine: m.user?.id === chat.userId }],
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
              <Text style={item.mine ? styles.mineText : styles.theirsText}>
                {item.text}
              </Text>
            </View>
          )}
        />
      )}

      <View style={styles.inputRow}>
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
