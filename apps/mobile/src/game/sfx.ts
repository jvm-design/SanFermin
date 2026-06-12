import { Audio } from "expo-av";

/**
 * Fire-and-forget game SFX. Lazy-loaded on first use; failures are
 * silently ignored (sound is juice, never a blocker).
 */
let sounds: Record<string, Audio.Sound> | null = null;
let loading: Promise<void> | null = null;

async function ensureLoaded(): Promise<void> {
  if (sounds) return;
  if (!loading) {
    loading = (async () => {
      await Audio.setAudioModeAsync({ playsInSilentModeIOS: true });
      const load = async (module: number) =>
        (await Audio.Sound.createAsync(module, { volume: 1.0 })).sound;
      const [throwS, splat, go, covered] = await Promise.all([
        load(require("../../assets/sfx/throw.wav")),
        load(require("../../assets/sfx/splat.wav")),
        load(require("../../assets/sfx/go.wav")),
        load(require("../../assets/sfx/covered.wav")),
      ]);
      sounds = { throw: throwS, splat, go, covered };
    })().catch(() => {
      loading = null;
    });
  }
  await loading;
}

function play(name: "throw" | "splat" | "go" | "covered") {
  ensureLoaded()
    .then(() => sounds?.[name]?.replayAsync())
    .catch(() => {});
}

export const sfx = {
  throw: () => play("throw"),
  splat: () => play("splat"),
  go: () => play("go"),
  covered: () => play("covered"),
};
