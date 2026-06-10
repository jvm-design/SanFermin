import React, { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
} from "react-native";
import { colors } from "../theme";

interface Props {
  onJoin: (code: string) => void;
  onBack: () => void;
}

/**
 * Phase 1: manual room code, no matchmaking. Both players type the same
 * code and land in the same room.
 */
export function JoinScreen({ onJoin, onBack }: Props) {
  const [code, setCode] = useState("");
  const trimmed = code.trim().toUpperCase();

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <Text style={styles.title}>Room code</Text>
      <Text style={styles.subtitle}>
        Agree on any code with your opponent and both enter it here.
      </Text>
      <TextInput
        style={styles.input}
        value={code}
        onChangeText={setCode}
        autoCapitalize="characters"
        autoCorrect={false}
        maxLength={8}
        placeholder="e.g. SPLAT"
        placeholderTextColor={colors.textDim}
        onSubmitEditing={() => trimmed && onJoin(trimmed)}
        returnKeyType="go"
        autoFocus
      />
      <Pressable
        style={[styles.button, !trimmed && styles.buttonDisabled]}
        disabled={!trimmed}
        onPress={() => onJoin(trimmed)}
      >
        <Text style={styles.buttonText}>Join battle</Text>
      </Pressable>
      <Pressable style={styles.back} onPress={onBack} hitSlop={12}>
        <Text style={styles.backText}>← Back</Text>
      </Pressable>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
    gap: 12,
  },
  title: { color: colors.text, fontSize: 30, fontWeight: "800" },
  subtitle: {
    color: colors.textDim,
    fontSize: 15,
    textAlign: "center",
    lineHeight: 22,
  },
  input: {
    marginTop: 12,
    backgroundColor: colors.surface,
    borderRadius: 14,
    paddingHorizontal: 22,
    paddingVertical: 14,
    color: colors.text,
    fontSize: 24,
    fontWeight: "700",
    letterSpacing: 4,
    textAlign: "center",
    minWidth: 220,
  },
  button: {
    marginTop: 16,
    backgroundColor: colors.tomato,
    paddingHorizontal: 42,
    paddingVertical: 15,
    borderRadius: 30,
  },
  buttonDisabled: { opacity: 0.4 },
  buttonText: { color: colors.white, fontSize: 18, fontWeight: "700" },
  back: { position: "absolute", top: 58, left: 20 },
  backText: { color: colors.textDim, fontSize: 15, fontWeight: "600" },
});
