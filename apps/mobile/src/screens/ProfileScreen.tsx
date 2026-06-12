import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
} from "react-native";
import { supabase } from "../lib/supabase";
import { colors } from "../theme";

interface Props {
  onClose: () => void;
}

/**
 * The anonymous profile. Only one editable field for now: the reveal name,
 * hidden from everyone until a mutual post-battle reveal (invariant 2).
 */
export function ProfileScreen({ onClose }: Props) {
  const [name, setName] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const load = async () => {
      if (!supabase) return;
      const { data } = await supabase.auth.getUser();
      const userId = data.user?.id;
      if (!userId) {
        setLoaded(true);
        return;
      }
      const { data: profile } = await supabase
        .from("profiles")
        .select("display_name")
        .eq("id", userId)
        .single();
      setName(profile?.display_name ?? "");
      setLoaded(true);
    };
    load();
  }, []);

  const save = async () => {
    if (!supabase) return;
    setBusy(true);
    setError(null);
    setSaved(false);
    const { data } = await supabase.auth.getUser();
    const userId = data.user?.id;
    if (!userId) {
      setBusy(false);
      setError("Session lost — sign in again.");
      return;
    }
    const trimmed = name.trim().slice(0, 24);
    const { error: err } = await supabase
      .from("profiles")
      .update({ display_name: trimmed.length > 0 ? trimmed : null })
      .eq("id", userId);
    setBusy(false);
    if (err) setError(err.message);
    else setSaved(true);
  };

  const signOut = async () => {
    if (supabase) await supabase.auth.signOut();
    onClose();
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <Text style={styles.emoji}>🎭</Text>
      <Text style={styles.title}>Your reveal name</Text>
      <Text style={styles.subtitle}>
        Hidden from everyone until you BOTH say yes after a battle. Leave it
        empty to stay "Tomato ####" even after a reveal.
      </Text>
      {!loaded ? (
        <ActivityIndicator color={colors.tomato} />
      ) : (
        <>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={(t) => {
              setName(t);
              setSaved(false);
            }}
            placeholder="Jaime"
            placeholderTextColor={colors.textDim}
            maxLength={24}
          />
          <Pressable style={styles.primary} disabled={busy} onPress={save}>
            {busy ? (
              <ActivityIndicator color={colors.white} />
            ) : (
              <Text style={styles.primaryText}>{saved ? "Saved ✓" : "Save"}</Text>
            )}
          </Pressable>
        </>
      )}
      {error && <Text style={styles.error}>{error}</Text>}

      <Pressable style={styles.signOut} onPress={signOut}>
        <Text style={styles.signOutText}>Sign out</Text>
      </Pressable>
      <Pressable style={styles.back} onPress={onClose} hitSlop={12}>
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
  emoji: { fontSize: 56 },
  title: { color: colors.text, fontSize: 28, fontWeight: "800", textAlign: "center" },
  subtitle: {
    color: colors.textDim,
    fontSize: 15,
    textAlign: "center",
    lineHeight: 22,
  },
  input: {
    marginTop: 10,
    backgroundColor: colors.surface,
    borderRadius: 14,
    paddingHorizontal: 22,
    paddingVertical: 14,
    color: colors.text,
    fontSize: 20,
    fontWeight: "600",
    textAlign: "center",
    minWidth: 240,
  },
  primary: {
    marginTop: 14,
    backgroundColor: colors.tomato,
    paddingHorizontal: 40,
    paddingVertical: 14,
    borderRadius: 28,
    minWidth: 180,
    alignItems: "center",
  },
  primaryText: { color: colors.white, fontSize: 17, fontWeight: "700" },
  error: { color: colors.tomato, fontSize: 14, textAlign: "center", marginTop: 8 },
  signOut: { position: "absolute", bottom: 40 },
  signOutText: { color: colors.textDim, fontSize: 14, fontWeight: "600" },
  back: { position: "absolute", top: 58, left: 20 },
  backText: { color: colors.textDim, fontSize: 15, fontWeight: "600" },
});
