const fs = require('fs');
const path = require('path');

function writeWavFile(filename, sampleRate, duration, sampleGenerator) {
  const totalSamples = Math.floor(sampleRate * duration);
  const data = new Int16Array(totalSamples);

  for (let i = 0; i < totalSamples; i++) {
    const t = i / sampleRate;
    let s = sampleGenerator(t, duration);
    s = Math.max(-0.98, Math.min(0.98, s));
    data[i] = Math.round(s * 32767);
  }

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

  const outDir = path.join(__dirname, '../public/sounds');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, filename), Buffer.concat([header, Buffer.from(data.buffer)]));
  console.log(`Generated: ${filename}`);
}

const SR = 44100;

// 1. wonky_brain: 8-bit retro arcade glitch & laughing zombie
writeWavFile('roar_wonky_brain.wav', SR, 2.5, (t, dur) => {
  const env = Math.exp(-t * 1.4);
  const freq = 440 + Math.sin(t * 35) * 220 + ((t * 8) % 1 > 0.5 ? 120 : -120);
  const square = Math.sign(Math.sin(2 * Math.PI * freq * t));
  const sub = Math.sin(2 * Math.PI * 55 * t);
  const laugh = Math.sin(2 * Math.PI * 8 * t) > 0 ? 1 : 0.2;
  return Math.tanh((square * 0.45 * laugh + sub * 0.5) * env * 1.8);
});

// 2. disco_kraken: 130 BPM funky disco slap & aquatic tentacle splash
writeWavFile('roar_disco_kraken.wav', SR, 2.6, (t, dur) => {
  const env = Math.exp(-t * 1.1);
  const beat = Math.sin(2 * Math.PI * (130 / 60) * 4 * t);
  const bass = Math.sin(2 * Math.PI * (65 + beat * 30) * t);
  const splash = (Math.random() * 2 - 1) * Math.exp(-((t % 0.46)) * 12);
  const tentacle = Math.sin(2 * Math.PI * 320 * t) * Math.sin(t * 22);
  return Math.tanh((bass * 0.6 + splash * 0.35 + tentacle * 0.3) * env * 2.0);
});

// 3. gymbro_chimera: Heavy bodybuilding power grunt & lion roar
writeWavFile('roar_gymbro_chimera.wav', SR, 2.8, (t, dur) => {
  const env = t < 0.1 ? t / 0.1 : Math.exp(-(t - 0.1) * 1.2);
  const sub = Math.sin(2 * Math.PI * (50 * Math.exp(-t * 0.5) + 30) * t);
  const saw = (t * 110) % 1 - 0.5;
  const grunt = Math.sin(2 * Math.PI * 18 * t) * 0.3;
  const rasp = (Math.random() * 2 - 1) * 0.25;
  return Math.tanh((sub * 0.6 + saw * 0.45 + grunt + rasp) * env * 2.4);
});

// 4. flying_fat_cat: Beast dragon growl turning into hilarious loud angry cat roar/meow
writeWavFile('roar_flying_fat_cat.wav', SR, 2.8, (t, dur) => {
  const env = t < 0.12 ? t / 0.12 : Math.exp(-(t - 0.12) * 1.1);
  // Transition from dragon bass growl to cat screech
  let pitch = t < 0.8 ? 95 + t * 60 : 420 * Math.exp(-(t - 0.8) * 0.6) + 260;
  // Cat vibrato / meow cry
  const meowMod = 1.0 + 0.25 * Math.sin(2 * Math.PI * 14 * t);
  const wave = Math.sin(2 * Math.PI * pitch * meowMod * t);
  const subDragon = Math.sin(2 * Math.PI * 45 * t) * (t < 0.9 ? 0.7 : 0.2);
  const purr = (Math.random() * 2 - 1) * (t < 0.8 ? 0.3 : 0.1);
  return Math.tanh((wave * 0.75 + subDragon * 0.4 + purr) * env * 2.2);
});

// 5. low_battery_bot: Electrical spark, stutter buzz, dying pitch drop
writeWavFile('roar_low_battery_bot.wav', SR, 2.5, (t, dur) => {
  const env = Math.exp(-t * 1.3);
  const batteryPitch = Math.max(30, 480 * Math.exp(-t * 2.2));
  const buzz = ((t * batteryPitch) % 1 > 0.5 ? 1 : -1) * (Math.sin(t * 30) > 0 ? 1 : 0.1);
  const spark = (Math.random() * 2 - 1) * ((Math.random() > 0.85) ? 0.8 : 0.05);
  return Math.tanh((buzz * 0.65 + spark * 0.5) * env * 2.0);
});

// 6. avocado_slime: Bouncy squishy resonant sweep & wet pop bubbles
writeWavFile('roar_avocado_slime.wav', SR, 2.4, (t, dur) => {
  const env = Math.exp(-t * 1.5);
  const freq = 120 + Math.sin(t * 18) * 80;
  const squish = Math.sin(2 * Math.PI * freq * t);
  const pop = Math.sin(2 * Math.PI * (600 * Math.exp(-((t % 0.35)) * 25)) * t);
  return Math.tanh((squish * 0.7 + pop * 0.45) * env * 2.2);
});

// 7. flying_piggy: High-pitch flying piglet squeal & fluttering wings
writeWavFile('roar_flying_piggy.wav', SR, 2.5, (t, dur) => {
  const env = Math.exp(-t * 1.3);
  const squealFreq = 650 + Math.sin(t * 24) * 280;
  const squeal = Math.sin(2 * Math.PI * squealFreq * t);
  const flutter = Math.sin(2 * Math.PI * 30 * t) * 0.3;
  return Math.tanh((squeal * 0.7 + flutter) * env * 2.0);
});

// 8. caffeine_vampire: Hyper 240 BPM ultrasonic bat screech & caffeine jitter
writeWavFile('roar_caffeine_vampire.wav', SR, 2.5, (t, dur) => {
  const env = Math.exp(-t * 1.2);
  const jitter = Math.sin(2 * Math.PI * 65 * t);
  const screech = Math.sin(2 * Math.PI * (1100 + jitter * 350) * t);
  const hiss = (Math.random() * 2 - 1) * 0.35;
  return Math.tanh((screech * 0.6 + hiss) * env * 2.2);
});

// 9. mega_chicken: Prehistoric dinosaur rooster morning crow (꼬끼오-!)
writeWavFile('roar_mega_chicken.wav', SR, 3.0, (t, dur) => {
  const env = t < 0.15 ? t / 0.15 : Math.exp(-(t - 0.15) * 1.0);
  // Crow envelope: cock-a-doodle-doo contour (low -> high -> high peak -> hold)
  let crowPitch = 180;
  if (t < 0.4) crowPitch = 160;
  else if (t < 0.9) crowPitch = 240;
  else if (t < 1.8) crowPitch = 380 + Math.sin(t * 16) * 40;
  else crowPitch = 260 * Math.exp(-(t - 1.8) * 1.2) + 120;

  const rooster = Math.sin(2 * Math.PI * crowPitch * t) + 0.5 * Math.sin(2 * Math.PI * crowPitch * 2 * t);
  const dinoSub = Math.sin(2 * Math.PI * 52 * t) * 0.6;
  return Math.tanh((rooster * 0.65 + dinoSub * 0.5) * env * 2.3);
});

// 10. scaredy_ghost: Ethereal trembling ghost wail & scared shriek
writeWavFile('roar_scaredy_ghost.wav', SR, 2.6, (t, dur) => {
  const env = Math.exp(-t * 1.2);
  const ghostFreq = 340 + Math.sin(2 * Math.PI * 11 * t) * 90;
  const ghost = Math.sin(2 * Math.PI * ghostFreq * t);
  const breath = (Math.random() * 2 - 1) * 0.2;
  return Math.tanh((ghost * 0.75 + breath) * env * 2.0);
});

// 11. karaoke_frog: Deep guttural frog ribbit + trot vibrato
writeWavFile('roar_karaoke_frog.wav', SR, 2.6, (t, dur) => {
  const env = Math.exp(-t * 1.2);
  const ribbitPitch = 110 + Math.sin(2 * Math.PI * 7 * t) * 45;
  const croak = Math.sin(2 * Math.PI * ribbitPitch * t) * (Math.sin(t * 40) > 0 ? 1 : 0.3);
  const micEcho = Math.sin(2 * Math.PI * (ribbitPitch * 3) * t) * 0.25;
  return Math.tanh((croak * 0.75 + micEcho) * env * 2.2);
});

// 12. pizza_crust_mummy: Sizzling hot oven bubbling cheese & pharaoh laugh
writeWavFile('roar_pizza_crust_mummy.wav', SR, 2.7, (t, dur) => {
  const env = Math.exp(-t * 1.1);
  const sizzle = (Math.random() * 2 - 1) * 0.4;
  const mummyVoice = Math.sin(2 * Math.PI * (75 + Math.sin(t * 12) * 35) * t);
  const cheeseStretch = Math.sin(2 * Math.PI * 280 * t) * Math.sin(t * 8);
  return Math.tanh((mummyVoice * 0.65 + sizzle * 0.3 + cheeseStretch * 0.25) * env * 2.2);
});

console.log('All 12 distinct monster roars successfully generated!');
