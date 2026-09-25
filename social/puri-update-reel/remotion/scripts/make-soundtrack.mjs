import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

// Original, deterministic 120 BPM synth bed for the 20-second reel.
const sampleRate = 44100;
const seconds = 20;
const count = sampleRate * seconds;
const pcm = Buffer.alloc(count * 2);
const twoPi = Math.PI * 2;
const notes = [207.65, 174.61, 138.59, 155.56]; // A♭3 · F3 · D♭3 · E♭3
const melody = [622.25, 554.37, 415.3, 466.16, 554.37, 622.25, 830.61, 698.46];
const noise = (n) => {
  let v = (n * 1664525 + 1013904223) >>> 0;
  v ^= v >>> 16;
  return (v / 0xffffffff) * 2 - 1;
};

for (let i = 0; i < count; i++) {
  const t = i / sampleRate;
  const beat = t % 0.5;
  const bar = Math.floor(t / 2);
  const root = notes[bar % notes.length];
  const kick = Math.sin(twoPi * (62 * beat - 20 * beat * beat)) * Math.exp(-24 * beat) * 0.32;
  const snarePhase = (t + 0.5) % 1;
  const snare = (noise(i) * 0.12 + Math.sin(twoPi * 180 * snarePhase) * 0.06) * Math.exp(-28 * snarePhase);
  const hatPhase = t % 0.25;
  const hat = noise(i * 3) * Math.exp(-95 * hatPhase) * 0.045;
  const bass = (Math.sin(twoPi * root * t) + 0.2 * Math.sin(twoPi * root * 2 * t)) * Math.exp(-4.6 * beat) * 0.12;
  const chord = [1, 1.2, 1.5].reduce((sum, ratio) => sum + Math.sin(twoPi * root * 2 * ratio * t), 0) * 0.023;
  const melodyPhase = t % 0.5;
  const note = melody[Math.floor(t / 0.5) % melody.length];
  const bell = (Math.sin(twoPi * note * t) + 0.24 * Math.sin(twoPi * note * 2 * t)) * Math.exp(-8 * melodyPhase) * 0.075;
  const gate = Math.min(1, t / 0.35, (seconds - t) / 0.55);
  const sample = Math.tanh((kick + snare + hat + bass + chord + bell) * 1.3) * Math.max(0, gate);
  pcm.writeInt16LE(Math.round(sample * 32767), i * 2);
}

const wav = Buffer.alloc(44 + pcm.length);
wav.write("RIFF", 0);
wav.writeUInt32LE(wav.length - 8, 4);
wav.write("WAVE", 8);
wav.write("fmt ", 12);
wav.writeUInt32LE(16, 16);
wav.writeUInt16LE(1, 20);
wav.writeUInt16LE(1, 22);
wav.writeUInt32LE(sampleRate, 24);
wav.writeUInt32LE(sampleRate * 2, 28);
wav.writeUInt16LE(2, 32);
wav.writeUInt16LE(16, 34);
wav.write("data", 36);
wav.writeUInt32LE(pcm.length, 40);
pcm.copy(wav, 44);

const output = resolve("public/puri-theme.wav");
await mkdir(dirname(output), { recursive: true });
await writeFile(output, wav);
process.stdout.write(`${output}\n`);
