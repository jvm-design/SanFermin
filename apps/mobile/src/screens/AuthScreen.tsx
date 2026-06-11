import React, { useState } from "react";
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
  onDone: () => void;
  onCancel: () => void;
}

type Step = "phone" | "code" | "adult";

/**
 * Anonymous account: phone-verified (one account per number — the
 * anti-abuse backbone) + hard 18+ gate (invariant 5). No name, no photo:
 * the account starts and stays an anonymous avatar until a mutual reveal.
 */
export function AuthScreen({ onDone, onCancel }: Props) {
  const [step, setStep] = useState<Step>("phone");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sendCode = async () => {
    if (!supabase) return;
    setBusy(true);
    setError(null);
    const { error: err } = await supabase.auth.signInWithOtp({ phone: phone.trim() });
    setBusy(false);
    if (err) setError(err.message);
    else setStep("code");
  };

  const verifyCode = async () => {
    if (!supabase) return;
    setBusy(true);
    setError(null);
    const { error: err } = await supabase.auth.verifyOtp({
      phone: phone.trim(),
      token: code.trim(),
      type: "sms",
    });
    setBusy(false);
    if (err) setError(err.message);
    else setStep("adult");
  };

  const confirmAdult = async () => {
    if (!supabase) return;
    setBusy(true);
    setError(null);
    const { data } = await supabase.auth.getUser();
    const userId = data.user?.id;
    if (!userId) {
      setBusy(false);
      setError("Session lost — try again.");
      setStep("phone");
      return;
    }
    const { error: err } = await supabase
      .from("profiles")
      .update({ is_adult: true })
      .eq("id", userId);
    setBusy(false);
    if (err) setError(err.message);
    else onDone();
  };

  const declineAdult = async () => {
    // Hard gate: under 18 means no account at all.
    if (supabase) await supabase.auth.signOut();
    onCancel();
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      {step === "phone" && (
        <>
          <Text style={styles.emoji}>🎭</Text>
          <Text style={styles.title}>Your anonymous avatar</Text>
          <Text style={styles.subtitle}>
            One verified phone = one account. Your number is never shown to
            anyone — you stay an anonymous avatar until you choose to reveal.
          </Text>
          <TextInput
            style={styles.input}
            value={phone}
            onChangeText={setPhone}
            placeholder="+33 6 12 34 56 78"
            placeholderTextColor={colors.textDim}
            keyboardType="phone-pad"
            autoFocus
          />
          <Pressable
            style={[styles.primary, (!phone.trim() || busy) && styles.disabled]}
            disabled={!phone.trim() || busy}
            onPress={sendCode}
          >
            {busy ? (
              <ActivityIndicator color={colors.white} />
            ) : (
              <Text style={styles.primaryText}>Send me a code</Text>
            )}
          </Pressable>
        </>
      )}

      {step === "code" && (
        <>
          <Text style={styles.emoji}>💬</Text>
          <Text style={styles.title}>Enter the code</Text>
          <Text style={styles.subtitle}>We texted a 6-digit code to {phone.trim()}.</Text>
          <TextInput
            style={styles.input}
            value={code}
            onChangeText={setCode}
            placeholder="123456"
            placeholderTextColor={colors.textDim}
            keyboardType="number-pad"
            maxLength={6}
            autoFocus
          />
          <Pressable
            style={[styles.primary, (code.trim().length < 6 || busy) && styles.disabled]}
            disabled={code.trim().length < 6 || busy}
            onPress={verifyCode}
          >
            {busy ? (
              <ActivityIndicator color={colors.white} />
            ) : (
              <Text style={styles.primaryText}>Verify</Text>
            )}
          </Pressable>
        </>
      )}

      {step === "adult" && (
        <>
          <Text style={styles.emoji}>🔞</Text>
          <Text style={styles.title}>Adults only</Text>
          <Text style={styles.subtitle}>
            Tomatina is for meeting strangers in the real world. It is strictly
            reserved for adults.
          </Text>
          <Pressable style={styles.primary} disabled={busy} onPress={confirmAdult}>
            {busy ? (
              <ActivityIndicator color={colors.white} />
            ) : (
              <Text style={styles.primaryText}>I confirm I'm 18 or older</Text>
            )}
          </Pressable>
          <Pressable style={styles.secondary} onPress={declineAdult}>
            <Text style={styles.secondaryText}>I'm under 18 — leave</Text>
          </Pressable>
        </>
      )}

      {error && <Text style={styles.error}>{error}</Text>}

      <Pressable style={styles.back} onPress={onCancel} hitSlop={12}>
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
    letterSpacing: 1,
    textAlign: "center",
    minWidth: 240,
  },
  primary: {
    marginTop: 14,
    backgroundColor: colors.tomato,
    paddingHorizontal: 40,
    paddingVertical: 14,
    borderRadius: 28,
    minWidth: 220,
    alignItems: "center",
  },
  primaryText: { color: colors.white, fontSize: 17, fontWeight: "700" },
  secondary: { paddingVertical: 10 },
  secondaryText: { color: colors.textDim, fontSize: 15, fontWeight: "600" },
  disabled: { opacity: 0.4 },
  error: { color: colors.tomato, fontSize: 14, textAlign: "center", marginTop: 8 },
  back: { position: "absolute", top: 58, left: 20 },
  backText: { color: colors.textDim, fontSize: 15, fontWeight: "600" },
});
