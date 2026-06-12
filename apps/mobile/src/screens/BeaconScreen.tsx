import React, { useEffect, useRef } from "react";
import { Animated, Pressable, StyleSheet, Text, View } from "react-native";
import { BeaconInfo } from "@tomatina/protocol";

interface Props {
  /** The revealed opponent name. */
  title: string;
  beacon: BeaconInfo;
  onContinue: () => void;
}

/**
 * The final beat of the storyboard, consent-safe (decision 0002): after
 * the MUTUAL reveal, both phones light up with the same emoji and color.
 * Hold it up, scan the room, find the matching screen — identification as
 * the earned reward of the battle, never its opener.
 */
export function BeaconScreen({ title, beacon, onContinue }: Props) {
  const pulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.18, duration: 700, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 700, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  return (
    <View style={[styles.container, { backgroundColor: beacon.color }]}>
      <Text style={styles.name}>{title} sees this too</Text>
      <Animated.Text style={[styles.emoji, { transform: [{ scale: pulse }] }]}>
        {beacon.emoji}
      </Animated.Text>
      <Text style={styles.instruction}>
        Hold your phone up.{"\n"}Find the matching screen 👀
      </Text>
      <Pressable style={styles.button} onPress={onContinue}>
        <Text style={styles.buttonText}>We found each other — chat 💬</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
    gap: 24,
  },
  name: {
    color: "#ffffff",
    fontSize: 18,
    fontWeight: "700",
    opacity: 0.9,
  },
  emoji: { fontSize: 140 },
  instruction: {
    color: "#ffffff",
    fontSize: 20,
    fontWeight: "800",
    textAlign: "center",
    lineHeight: 30,
  },
  button: {
    marginTop: 22,
    backgroundColor: "#ffffff",
    paddingHorizontal: 32,
    paddingVertical: 15,
    borderRadius: 30,
  },
  buttonText: { color: "#1a0d0a", fontSize: 16, fontWeight: "800" },
});
