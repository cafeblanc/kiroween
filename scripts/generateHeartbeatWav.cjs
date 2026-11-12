const fs = require('fs');
const path = require('path');

function createWavBuffer(sampleRate, durationSeconds, generateSampleFn) {
  const totalSamples = Math.floor(sampleRate * durationSeconds);
  const buffer = Buffer.alloc(44 + totalSamples * 2);

  // RIFF Header
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + totalSamples * 2, 4);
  buffer.write('WAVE', 8);
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);  // PCM
  buffer.writeUInt16LE(1, 22);  // Mono
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * 2, 28);
  buffer.writeUInt16LE(2, 32);
  buffer.writeUInt16LE(16, 34);
  buffer.write('data', 36);
  buffer.writeUInt32LE(totalSamples * 2, 40);

  // Brown noise for wet biological acoustics
  const noise = new Float64Array(totalSamples);
  let lastNoise = 0;
  for (let i = 0; i < totalSamples; i++) {
    const white = Math.random() * 2 - 1;
    lastNoise = (lastNoise + (0.04 * white)) / 1.04;
    noise[i] = lastNoise;
  }
  // Low-pass noise below 60Hz
  const filteredNoise = new Float64Array(totalSamples);
  let fVal = 0;
  const alpha = (2 * Math.PI * 60) / sampleRate;
  for (let i = 0; i < totalSamples; i++) {
    fVal += alpha * (noise[i] - fVal);
    filteredNoise[i] = fVal;
  }

  for (let i = 0; i < totalSamples; i++) {
    const t = i / sampleRate;
    const sample = generateSampleFn(t, i, filteredNoise);
    const clamped = Math.max(-0.99, Math.min(0.99, sample));
    buffer.writeInt16LE(Math.floor(clamped * 32767), 44 + i * 2);
  }

  return buffer;
}

// Single Beat Synthesizer (Heavy Cinematic "쿵... 쾅!")
function singleBeatSample(t, i, noise) {
  let sample = 0;

  // S1 (쿵! Lub) - 0.02s to 0.22s
  const t1 = t - 0.02;
  if (t1 >= 0 && t1 < 0.20) {
    // Punchy non-linear envelope: 6ms attack, heavy body
    const attack = Math.min(1.0, t1 / 0.006);
    const decay = Math.exp(-t1 * 16);
    const env = attack * decay;

    // Organic chest compression: 54Hz dropping to 24Hz
    const freq1 = 54 * Math.exp(-t1 * 10) + 24;
    const phase1 = 2 * Math.PI * freq1 * t1;
    const w1 = Math.sin(phase1);

    // Deep sub-harmonic infrasound (28Hz down to 14Hz)
    const freqSub = 28 * Math.exp(-t1 * 8) + 14;
    const phaseSub = 2 * Math.PI * freqSub * t1;
    const wSub = Math.sin(phaseSub);

    // Muffled tissue/fluid turbulence
    const turb = noise[i] * 2.2;

    const raw = (w1 * 1.4 + wSub * 1.1 + turb * 0.5) * env;
    sample += Math.tanh(raw * 2.4) * 0.98;
  }

  // S2 (쾅! Dub) - 0.17s to 0.35s
  const t2 = t - 0.165;
  if (t2 >= 0 && t2 < 0.18) {
    const attack2 = Math.min(1.0, t2 / 0.005);
    const decay2 = Math.exp(-t2 * 20);
    const env2 = attack2 * decay2;

    // Aortic valve closure: 68Hz dropping to 32Hz
    const freq2 = 68 * Math.exp(-t2 * 12) + 32;
    const phase2 = 2 * Math.PI * freq2 * t2;
    const w2 = Math.sin(phase2);

    // Thoracic cavity bounce (38Hz down to 20Hz)
    const freqSub2 = 38 * Math.exp(-t2 * 9) + 20;
    const phaseSub2 = 2 * Math.PI * freqSub2 * t2;
    const wSub2 = Math.sin(phaseSub2);

    const turb2 = noise[i] * 1.8;

    const raw2 = (w2 * 1.3 + wSub2 * 0.9 + turb2 * 0.4) * env2;
    sample += Math.tanh(raw2 * 2.2) * 0.92;
  }

  return sample;
}

const sampleRate = 44100;
const singleWav = createWavBuffer(sampleRate, 0.55, singleBeatSample);

const outDir = path.join(__dirname, '..', 'public', 'sounds');
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

fs.writeFileSync(path.join(outDir, 'cardiac_thump_organic.wav'), singleWav);
console.log(`Saved: public/sounds/cardiac_thump_organic.wav (${singleWav.length} bytes)`);
