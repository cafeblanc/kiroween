const fs = require('fs');
const path = require('path');

function createCutePiggyWav() {
  const sampleRate = 22050;
  const duration = 2.2;
  const numSamples = Math.floor(sampleRate * duration);
  const buffer = Buffer.alloc(44 + numSamples * 2);

  // WAV header
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + numSamples * 2, 4);
  buffer.write('WAVE', 8);
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20); // PCM
  buffer.writeUInt16LE(1, 22); // mono
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * 2, 28);
  buffer.writeUInt16LE(2, 32);
  buffer.writeUInt16LE(16, 34);
  buffer.write('data', 36);
  buffer.writeUInt32LE(numSamples * 2, 40);

  // Generate cute piglet oinks: "꿀꿀! 꿀꿀꿀~!"
  // Rhythm: Oink 1 (0.1~0.4s), Oink 2 (0.5~0.8s), High squeal Oink 3 (1.0~1.7s)
  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    let s = 0;

    // Oink 1 (0.1s - 0.45s): Formant guttural piglet grunt (220Hz modulated by 45Hz throat vibration)
    if (t >= 0.1 && t <= 0.45) {
      const p = (t - 0.1) / 0.35;
      const env = Math.sin(p * Math.PI);
      const pitch = 240 + Math.sin(t * 180) * 40 - p * 60;
      const grunt = Math.sin(2 * Math.PI * pitch * t) * 0.6 + Math.sin(2 * Math.PI * pitch * 2 * t) * 0.3;
      const throatMod = (Math.sin(2 * Math.PI * 48 * t) + 1) * 0.5;
      s += grunt * throatMod * env * 0.85;
    }

    // Oink 2 (0.55s - 0.9s): Second bouncy oink (280Hz)
    if (t >= 0.55 && t <= 0.9) {
      const p = (t - 0.55) / 0.35;
      const env = Math.sin(p * Math.PI);
      const pitch = 290 + Math.sin(t * 210) * 50 - p * 70;
      const grunt = Math.sin(2 * Math.PI * pitch * t) * 0.65 + Math.sin(2 * Math.PI * pitch * 1.5 * t) * 0.25;
      const throatMod = (Math.sin(2 * Math.PI * 52 * t) + 1) * 0.5;
      s += grunt * throatMod * env * 0.9;
    }

    // Oink 3 (1.05s - 1.95s): Cute happy high piglet squeal (440Hz -> 680Hz -> 320Hz)
    if (t >= 1.05 && t <= 1.95) {
      const p = (t - 1.05) / 0.9;
      const env = Math.sin(p * Math.PI);
      const pitch = 420 + Math.sin(p * Math.PI) * 260;
      const squeal = Math.sin(2 * Math.PI * pitch * t) * 0.7 + Math.sin(2 * Math.PI * (pitch * 1.5) * t) * 0.2;
      const vibrato = 1 + Math.sin(2 * Math.PI * 18 * t) * 0.25;
      s += squeal * vibrato * env * 0.95;
    }

    // Soft clamp
    s = Math.max(-1, Math.min(1, s));
    const sampleInt = Math.floor(s * 31000);
    buffer.writeInt16LE(sampleInt, 44 + i * 2);
  }

  const outPath = path.join(__dirname, '..', 'public', 'sounds', 'roar_flying_piggy.wav');
  fs.writeFileSync(outPath, buffer);
  console.log('Successfully wrote cute piggy sound to', outPath);
}

createCutePiggyWav();
