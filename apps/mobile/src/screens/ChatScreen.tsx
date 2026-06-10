import React, { useState } from "react";
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
import { colors } from "../theme";

interface Message {
  id: number;
  text: string;
}

/** Phase 0 mock: local-only chat shell. Stream Chat arrives in Phase 2. */
export function ChatScreen({ onClose }: { onClose: () => void }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");

  const send = () => {
    const text = draft.trim();
    if (!text) return;
    setMessages((m) => [...m, { id: m.length + 1, text }]);
    setDraft("");
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
          <Text style={styles.name}>Tomato Tester</Text>
          <Text style={styles.revealed}>revealed by mutual consent</Text>
        </View>
      </View>

      {messages.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyEmoji}>💬</Text>
          <Text style={styles.emptyText}>
            You both said yes. Say hi — you just had a tomato fight.
          </Text>
        </View>
      ) : (
        <FlatList
          style={styles.list}
          contentContainerStyle={styles.listContent}
          data={messages}
          keyExtractor={(m) => String(m.id)}
          renderItem={({ item }) => (
            <View style={styles.bubble}>
              <Text style={styles.bubbleText}>{item.text}</Text>
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
  list: { flex: 1 },
  listContent: { padding: 16, gap: 8 },
  bubble: {
    alignSelf: "flex-end",
    backgroundColor: colors.tomato,
    borderRadius: 16,
    borderBottomRightRadius: 4,
    paddingHorizontal: 14,
    paddingVertical: 9,
    maxWidth: "80%",
  },
  bubbleText: { color: colors.white, fontSize: 15 },
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
