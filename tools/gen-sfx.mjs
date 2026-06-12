// Synthesizes the game's sound effects as 16-bit mono WAVs.
// Run: node tools/gen-sfx.mjs   (outputs to apps/mobile/assets/sfx/)
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const RATE = 22050;
const OUT = join(dirname(fileURLToPath(import.meta.url)), "../apps/mobile/assets/sfx");
mkdirSync(OUT, { recursive: true });

function writeWav(name, samples) {
  const n = samples.length;
  const buf = Buffer.alloc(44 + n * 2);
  buf.write("RIFF", 0);
  buf.writeUInt32LE(36 + n * 2, 4);
  buf.write("WAVE", 8);
  buf.write("fmt ", 12);
  buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20); // PCM
  buf.writeUInt16LE(1, 22); // mono
  buf.writeUInt32LE(RATE, 24);
  buf.writeUInt32LE(RATE * 2, 28);
  buf.writeUInt16LE(2, 32);
  buf.writeUInt16LE(16, 34);
  buf.write("data", 36);
  buf.writeUInt32LE(n * 2, 40);
  // normalize to 0.9
  let peak = 0;
  for (const s of samples) peak = Math.max(peak, Math.abs(s));
  const gain = peak > 0 ? 0.9 / peak : 1;
  for (let i = 0; i < n; i++) {
    buf.writeInt16LE(Math.round(samples[i] * gain * 32767), 44 + i * 2);
  }
  writeFileSync(join(OUT, name), buf);
  console.log(`wrote ${name} (${(n / RATE).toFixed(2)}s)`);
}

const sec = (s) => Math.floor(s * RATE);
const rand = () => Math.random() * 2 - 1;

// throw.wav — a short whoosh: noise through a closing lowpass filter
{
  const n = sec(0.18);
  const out = new Float64Array(n);
  let y = 0;
  for (let i = 0; i < n; i++) {
    const t = i / n;
    const cutoff = 0.85 - 0.75 * t; // filter closes -> falling whoosh
    y += cutoff * (rand() - y);
    const env = Math.sin(Math.PI * Math.min(1, t * 1.15)) ** 1.5;
    out[i] = y * env;
  }
  writeWav("throw.wav", out);
}

// splat.wav — wet impact: noise burst + pitch-dropping thump
{
  const n = sec(0.26);
  const out = new Float64Array(n);
  let y = 0;
  let phase = 0;
  for (let i = 0; i < n; i++) {
    const t = i / RATE;
    y += 0.6 * (rand() - y);
    const burst = y * Math.exp(-t * 38);
    const freq = 150 * Math.exp(-t * 6) + 45;
    phase += (2 * Math.PI * freq) / RATE;
    const thump = Math.sin(phase) * Math.exp(-t * 14);
    const wet = 0.4 * rand() * Math.exp(-t * 9) * Math.sin(t * 70);
    out[i] = burst * 0.9 + thump * 0.8 + wet;
  }
  writeWav("splat.wav", out);
}

// go.wav — two rising blips
{
  const n = sec(0.22);
  const out = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    const t = i / RATE;
    const inSecond = t > 0.1;
    const f = inSecond ? 880 : 587;
    const lt = inSecond ? t - 0.1 : t;
    const env = Math.min(1, lt / 0.01) * Math.exp(-lt * 28);
    out[i] = Math.sin(2 * Math.PI * f * t) * env;
  }
  writeWav("go.wav", out);
}

// covered.wav — the big final splash: double burst + deep thump
{
  const n = sec(0.55);
  const out = new Float64Array(n);
  let y = 0;
  let phase = 0;
  for (let i = 0; i < n; i++) {
    const t = i / RATE;
    y += 0.5 * (rand() - y);
    const burst1 = y * Math.exp(-t * 22);
    const t2 = Math.max(0, t - 0.16);
    const burst2 = y * (t > 0.16 ? Math.exp(-t2 * 30) * 0.6 : 0);
    const freq = 110 * Math.exp(-t * 4) + 38;
    phase += (2 * Math.PI * freq) / RATE;
    const thump = Math.sin(phase) * Math.exp(-t * 7);
    out[i] = burst1 * 0.9 + burst2 + thump * 0.9;
  }
  writeWav("covered.wav", out);
}
