const fs = require('fs');
const path = require('path');

// Generate 44.1kHz 16-bit Mono Cinematic Biological Heartbeat WAV
const sampleRate = 44100;
const totalDuration = 0.65; // 650ms for one full Lub-Dub cycle
const totalSamples = Math.floor(sampleRate * totalDuration);
const buffer = Buffer.alloc(44 + totalSamples * 2);

// RIFF Header
buffer.write('RIFF', 0);
buffer.writeUInt32LE(36 + totalSamples * 2, 4);
buffer.write('WAVE', 8);
buffer.write('fmt ', 12);
buffer.writeUInt32LE(16, 16); // Subchunk1Size
buffer.writeUInt16LE(1, 20);  // PCM format
buffer.writeUInt16LE(1, 22);  // Mono
buffer.writeUInt32LE(sampleRate, 24);
buffer.writeUInt32LE(sampleRate * 2, 28); // ByteRate
buffer.writeUInt16LE(2, 32);  // BlockAlign
buffer.writeUInt16LE(16, 34); // BitsPerSample
buffer.write('data', 36);
buffer.writeUInt32LE(totalSamples * 2, 40);

// Generate Organic Brown Noise / Fluid Turbulent Buffer
const noise = new Float64Array(totalSamples);
let lastNoise = 0;
for (let i = 0; i < totalSamples; i++) {
  const white = Math.random() * 2 - 1;
  lastNoise = (lastNoise + (0.04 * white)) / 1.04;
  noise[i] = lastNoise * 3.5;
}

// Low-pass filter noise below 75 Hz
const filteredNoise = new Float64Array(totalSamples);
let filterVal = 0;
const alpha = (2 * Math.PI * 70) / sampleRate;
for (let i = 0; i < totalSamples; i++) {
  filterVal += alpha * (noise[i] - filterVal);
  filteredNoise[i] = filterVal;
}

// Synthesize S1 (Lub - 쿵) and S2 (Dub - 쾅)
// S1 starts at t = 0.04s, S2 starts at t = 0.22s
for (let i = 0; i < totalSamples; i++) {
  const t = i / sampleRate;
  let sample = 0;

  // --- S1: LUB (쿵) ---
  const t1 = t - 0.03;
  if (t1 >= 0 && t1 < 0.20) {
    // Smooth cosine envelope for organic attack/decay (no click)
    const env = Math.sin((t1 / 0.20) * Math.PI);
    const envShaped = Math.pow(env, 1.4);

    // Deep sub-bass primary pressure wave: 58 Hz decaying to 28 Hz
    const freq1 = 58 - (t1 / 0.20) * 30;
    const phase1 = 2 * Math.PI * (58 * t1 - 0.5 * (30 / 0.20) * t1 * t1);
    const wave1 = Math.sin(phase1);

    // Sub-harmonic body boom (32 Hz decaying to 18 Hz)
    const phaseSub = 2 * Math.PI * (32 * t1 - 0.5 * (14 / 0.20) * t1 * t1);
    const waveSub = Math.sin(phaseSub);

    // Muffled tissue/fluid turbulence
    const turb = filteredNoise[i] * 0.45;

    // Fleshy visceral impact compression
    const rawS1 = (wave1 * 0.72 + waveSub * 0.45 + turb) * envShaped;
    // Soft saturation for deep body thud
    sample += Math.tanh(rawS1 * 1.5) * 0.85;
  }

  // --- S2: DUB (쾅) ---
  const t2 = t - 0.20;
  if (t2 >= 0 && t2 < 0.16) {
    // Slightly tighter envelope for semilunar valve snap
    const env2 = Math.sin((t2 / 0.16) * Math.PI);
    const envShaped2 = Math.pow(env2, 1.5);

    // Aortic closure pitch: 68 Hz decaying to 36 Hz
    const phase2 = 2 * Math.PI * (68 * t2 - 0.5 * (32 / 0.16) * t2 * t2);
    const wave2 = Math.sin(phase2);

    // Secondary cavity resonance (42 Hz)
    const waveSub2 = Math.sin(2 * Math.PI * 42 * t2);

    // Fluid turbulence
    const turb2 = filteredNoise[i] * 0.35;

    const rawS2 = (wave2 * 0.65 + waveSub2 * 0.40 + turb2) * envShaped2;
    sample += Math.tanh(rawS2 * 1.4) * 0.75;
  }

  // Master output clamp to 16-bit signed PCM
  const clamped = Math.max(-1, Math.min(1, sample));
  const intSample = Math.floor(clamped * 32767);
  buffer.writeInt16LE(intSample, 44 + i * 2);
}

// Ensure public/sounds exists
const outDir = path.join(__dirname, '..', 'public', 'sounds');
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

const outFile = path.join(outDir, 'cardiac_thump_organic.wav');
fs.writeFileSync(outFile, buffer);
console.log(`Successfully generated organic heartbeat WAV: ${outFile} (${buffer.length} bytes)`);
