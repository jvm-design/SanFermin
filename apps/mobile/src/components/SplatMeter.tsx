import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { COVER_THRESHOLD } from "@tomatina/shared";
import { colors } from "../theme";

export function SplatMeter({ label, value }: { label: string; value: number }) {
  const pct = Math.min(1, value / COVER_THRESHOLD);
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${pct * 100}%` }]} />
      </View>
      <Text style={styles.pct}>{Math.round(pct * 100)}%</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 3,
  },
  label: {
    color: colors.textDim,
    fontSize: 13,
    width: 44,
    fontWeight: "600",
  },
  track: {
    flex: 1,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.meterTrack,
    overflow: "hidden",
  },
  fill: {
    height: "100%",
    borderRadius: 5,
    backgroundColor: colors.tomato,
  },
  pct: {
    color: colors.textDim,
    fontSize: 12,
    width: 38,
    textAlign: "right",
    fontVariant: ["tabular-nums"],
  },
});
