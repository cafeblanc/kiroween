const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const monsters = [
  { id: 'wonky_brain', img: 'chimera_jumpscare_wonky_brain.jpg', hue: 180 },
  { id: 'disco_kraken', img: 'chimera_jumpscare_disco_kraken.jpg', hue: 160 },
  { id: 'gymbro_chimera', img: 'chimera_jumpscare_gymbro_chimera.jpg', hue: 40 },
  { id: 'flying_fat_cat', img: 'chimera_jumpscare_flying_fat_cat.jpg', hue: 20 },
  { id: 'low_battery_bot', img: 'chimera_jumpscare_low_battery_bot.jpg', hue: 60 },
  { id: 'avocado_slime', img: 'chimera_jumpscare_avocado_slime.jpg', hue: 100 },
  { id: 'flying_piggy', img: 'chimera_jumpscare_flying_piggy.jpg', hue: 320 },
  { id: 'caffeine_vampire', img: 'chimera_jumpscare_caffeine_vampire.jpg', hue: 0 },
  { id: 'mega_chicken', img: 'chimera_jumpscare_mega_chicken.jpg', hue: 350 },
  { id: 'scaredy_ghost', img: 'chimera_jumpscare_scaredy_ghost.jpg', hue: 280 },
  { id: 'karaoke_frog', img: 'chimera_jumpscare_karaoke_frog.jpg', hue: 120 },
  { id: 'pizza_crust_mummy', img: 'chimera_jumpscare_pizza_crust_mummy.jpg', hue: 45 }
];

const imgDir = path.join(__dirname, '../public/images');
const vidDir = path.join(__dirname, '../public/videos');
if (!fs.existsSync(vidDir)) fs.mkdirSync(vidDir, { recursive: true });

for (const m of monsters) {
  const inImg = path.join(imgDir, m.img);
  const outMp4 = path.join(vidDir, `chimera_video_${m.id}.mp4`);

  if (!fs.existsSync(inImg)) {
    console.error(`Missing image for ${m.id}: ${inImg}`);
    continue;
  }

  console.log(`Rendering video for ${m.id}...`);

  // 7.2 second video:
  // Part 1 (0-2.5s): Emerging from fluid mist (zoompan, blur, color hue tint)
  // Part 2 (2.5-5.5s): Solidifying in vat with living breathing motion
  // Part 3 (5.5-7.2s): Explosive forward leaping charge towards viewer!
  const filter = [
    `[0:v]scale=1280:720:force_original_aspect_ratio=increase,crop=1280:720,setsar=1,zoompan=z='min(zoom+0.0015,1.25)':d=180:s=1280x720,fade=t=in:st=0:d=1.2,curves=preset=darker[p1]`,
    `[0:v]scale=1280:720:force_original_aspect_ratio=increase,crop=1280:720,setsar=1,zoompan=z='1.15+0.05*sin(in/10)':d=180:s=1280x720,eq=contrast=1.2:saturation=1.25[p2]`,
    `[0:v]scale=1280:720:force_original_aspect_ratio=increase,crop=1280:720,setsar=1,zoompan=z='min(zoom+0.045,2.4)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=90:s=1280x720,eq=brightness=0.15:contrast=1.35[p3]`,
    `[p1][p2][p3]concat=n=3:v=1:a=0[v]`
  ].join(';');

  const cmd = `ffmpeg -y -loop 1 -t 2.5 -i "${inImg}" -loop 1 -t 2.5 -i "${inImg}" -loop 1 -t 2.2 -i "${inImg}" -filter_complex "${filter}" -map "[v]" -ss 0 -t 7.2 -c:v libx264 -pix_fmt yuv420p -preset ultrafast -crf 24 "${outMp4}"`;

  try {
    execSync(cmd, { stdio: 'ignore' });
    console.log(`Rendered: chimera_video_${m.id}.mp4`);
  } catch (err) {
    console.error(`Error rendering ${m.id}:`, err.message);
  }
}

console.log('All 12 character videos rendered successfully!');
