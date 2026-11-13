const fs = require('fs');
const path = require('path');

// Generate 16-bit PCM 44.1kHz Mono WAV Monster Roar with layered beast vocal tract
function generateMonsterRoarWav() {
  const sampleRate = 44100;
  const duration = 3.2; // 3.2 seconds of roaring terror
  const totalSamples = Math.floor(sampleRate * duration);
  const data = new Int16Array(totalSamples);

  for (let i = 0; i < totalSamples; i++) {
    const t = i / sampleRate;

    // Envelope: quick explosive rise (0.05s) -> high sustain -> slow tail
    let env = 1.0;
    if (t < 0.08) {
      env = t / 0.08;
    } else if (t < 2.2) {
      env = 0.95 - (t - 0.08) * 0.15;
    } else {
      env = 0.63 * (1.0 - (t - 2.2) / 1.0);
    }
    env = Math.max(0, Math.min(1, env));

    // 1. Explosive Glass Shatter Transient (t: 0 to 0.15s)
    let shatter = 0;
    if (t < 0.18) {
      const shatterEnv = Math.exp(-t * 28);
      const white = (Math.random() * 2 - 1);
      const highRing = Math.sin(2 * Math.PI * 3400 * t) + Math.sin(2 * Math.PI * 5200 * t);
      shatter = (white * 0.7 + highRing * 0.3) * shatterEnv * 0.85;
    }

    // 2. Sub-Bass Shockwave Tremor (45Hz -> 25Hz)
    const subFreq = 50 * Math.exp(-t * 0.5) + 24;
    const subWave = Math.sin(2 * Math.PI * subFreq * t);

    // 3. Beast Guttural Vocal Chord (Non-linear Sawtooth with Vibrato & Growl)
    // Growl modulation: 28Hz amplitude tremble
    const growlTremble = 1.0 + 0.35 * Math.sin(2 * Math.PI * 26 * t);
    const basePitch = (t < 0.4 ? 85 + t * 90 : 120 * Math.exp(-(t - 0.4) * 0.4) + 38);
    // Sawtooth harmonic sum
    let vocal = 0;
    for (let h = 1; h <= 7; h++) {
      const harmAmp = (1.0 / h) * (h % 2 === 1 ? 1.0 : 0.6);
      vocal += harmAmp * Math.sin(2 * Math.PI * basePitch * h * t);
    }

    // 4. Throat Resonant Formants & Rasping Noise
    const rasp = (Math.random() * 2 - 1) * 0.28 * env;
    const screech = Math.sin(2 * Math.PI * (basePitch * 3.4) * t) * 0.35;

    // Distort & Saturate (Overdrive / Hard Clipping soft curve)
    let mixed = (subWave * 0.45 + vocal * 0.55 * growlTremble + rasp + screech + shatter) * env;
    // Soft limiter tanh
    mixed = Math.tanh(mixed * 2.2);

    // Master Gain
    mixed = Math.max(-0.98, Math.min(0.98, mixed));

    data[i] = Math.round(mixed * 32767);
  }

  // Create WAV header
  const byteRate = sampleRate * 2;
  const blockAlign = 2;
  const dataSize = totalSamples * 2;
  const header = Buffer.alloc(44);

  header.write('RIFF', 0);
  header.writeUInt32LE(36 + dataSize, 4);
  header.write('WAVE', 8);
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20); // PCM
  header.writeUInt16LE(1, 22); // Mono
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE(blockAlign, 32);
  header.writeUInt16LE(16, 34); // 16-bit
  header.write('data', 36);
  header.writeUInt32LE(dataSize, 40);

  const dataBuffer = Buffer.from(data.buffer);
  const outPath = path.join(__dirname, '../public/sounds/monster_roar_ferocious.wav');
  fs.writeFileSync(outPath, Buffer.concat([header, dataBuffer]));
  console.log('Ferocious monster roar written to:', outPath);
}

generateMonsterRoarWav();
