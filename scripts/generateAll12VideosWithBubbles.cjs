const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const monsters = [
  { id: 'wonky_brain', img: 'chimera_jumpscare_wonky_brain.jpg' },
  { id: 'disco_kraken', img: 'chimera_jumpscare_disco_kraken.jpg' },
  { id: 'gymbro_chimera', img: 'chimera_jumpscare_gymbro_chimera.jpg' },
  { id: 'flying_fat_cat', img: 'chimera_jumpscare_flying_fat_cat.jpg' },
  { id: 'low_battery_bot', img: 'chimera_jumpscare_low_battery_bot.jpg' },
  { id: 'avocado_slime', img: 'chimera_jumpscare_avocado_slime.jpg' },
  { id: 'flying_piggy', img: 'chimera_jumpscare_flying_piggy.jpg' },
  { id: 'caffeine_vampire', img: 'chimera_jumpscare_caffeine_vampire.jpg' },
  { id: 'mega_chicken', img: 'chimera_jumpscare_mega_chicken.jpg' },
  { id: 'scaredy_ghost', img: 'chimera_jumpscare_scaredy_ghost.jpg' },
  { id: 'karaoke_frog', img: 'chimera_jumpscare_karaoke_frog.jpg' },
  { id: 'pizza_crust_mummy', img: 'chimera_jumpscare_pizza_crust_mummy.jpg' }
];

const imgDir = path.join(__dirname, '../public/images');
const vidDir = path.join(__dirname, '../public/videos');
const userVatSphereImg = path.join(imgDir, 'bioreactor_sphere_pulsing.png');
const cellImg = path.join(imgDir, 'chimera_microscopy_quad.jpg');

if (!fs.existsSync(userVatSphereImg) || !fs.existsSync(cellImg)) {
  console.error('Base user vat sphere or cell images missing!');
  process.exit(1);
}

for (const m of monsters) {
  const monsterImg = path.join(imgDir, m.img);
  const outMp4 = path.join(vidDir, `chimera_video_${m.id}.mp4`);

  if (!fs.existsSync(monsterImg)) {
    console.error(`Missing monster image for ${m.id}`);
    continue;
  }

  console.log(`Rendering in-vat continuous growth video (15.0s) for [${m.id}]...`);

  // Section 1 (0.0s - 3.5s): 배양기 중앙 세포 구체 태동 & 뽀글뽀글 기포 상승 (Glass Vat + Center Embryo Sphere)
  // Section 2 (3.5s - 6.5s): 구체 내부 실제 줄기세포 군집 분열 현미경 사진 일렁임 (Confocal Stem-Cells dividing in sphere)
  // Section 3 (6.5s - 8.5s): [성장 1단계] 구체 속에서 괴수의 어린 배아 형태 발현 (Early Embryo, scale 25%)
  // Section 4 (8.5s - 10.5s): [성장 2단계] 배양액 속으로 골격과 근육이 급속 팽창 성장 (Juvenile Growth, scale 60%)
  // Section 5 (10.5s - 13.0s): [성장 3단계] 배양기를 가득 채우는 거대 완전체 괴수 완성 및 유영 (Full Adult Monster in vat)
  // Section 6 (13.0s - 15.0s): [돌출 4단계] 화면을 향해 3D 폭발 돌진!
  const filter = [
    // [0] Real Glass Vat + Center Embryo Sphere (3.5s, 105 frames)
    `[0:v]scale=1280:720:force_original_aspect_ratio=increase,crop=1280:720,setsar=1,zoompan=z='min(zoom+0.002,1.25)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=105:s=1280x720,fade=t=in:st=0:d=0.5,eq=contrast=1.15:saturation=1.2[p1]`,
    // [1] Confocal Stem-Cells undulating (3.0s, 90 frames)
    `[1:v]scale=1280:720:force_original_aspect_ratio=increase,crop=1280:720,setsar=1,zoompan=z='1.10+0.06*sin(in/10)':d=90:s=1280x720,fade=t=in:st=0:d=0.5,eq=contrast=1.3:saturation=1.4[p2]`,
    // [2] Growth Step 1: Early Embryo emerging inside sphere (2.0s, 60 frames) - zoomed out small embryo
    `[2:v]scale=1280:720:force_original_aspect_ratio=increase,crop=1280:720,setsar=1,zoompan=z='0.65+0.003*in':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=60:s=1280x720,fade=t=in:st=0:d=0.4,eq=contrast=1.2:saturation=1.1:brightness=-0.05[p3]`,
    // [3] Growth Step 2: Rapid body expansion in amniotic fluid (2.0s, 60 frames) - medium growing monster
    `[2:v]scale=1280:720:force_original_aspect_ratio=increase,crop=1280:720,setsar=1,zoompan=z='0.85+0.005*in':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=60:s=1280x720,fade=t=in:st=0:d=0.4,eq=contrast=1.25:saturation=1.25[p4]`,
    // [4] Growth Step 3: Full-size adult monster living and flexing in vat (2.5s, 75 frames) - filling tank
    `[2:v]scale=1280:720:force_original_aspect_ratio=increase,crop=1280:720,setsar=1,zoompan=z='1.15+0.04*sin(in/12)':d=75:s=1280x720,fade=t=in:st=0:d=0.4,eq=contrast=1.2:saturation=1.2[p5]`,
    // [5] 3D IMAX Forward Burst (2.0s, 60 frames) - exploding into camera
    `[2:v]scale=1280:720:force_original_aspect_ratio=increase,crop=1280:720,setsar=1,zoompan=z='min(zoom+0.04,2.5)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=60:s=1280x720,eq=brightness=0.18:contrast=1.35[p6]`,
    `[p1][p2][p3][p4][p5][p6]concat=n=6:v=1:a=0[v]`
  ].join(';');

  const cmd = `ffmpeg -y -loop 1 -t 3.5 -i "${userVatSphereImg}" -loop 1 -t 3.0 -i "${cellImg}" -loop 1 -t 8.5 -i "${monsterImg}" -filter_complex "${filter}" -map "[v]" -ss 0 -t 15.0 -c:v libx264 -pix_fmt yuv420p -r 30 -preset ultrafast -crf 23 "${outMp4}"`;

  try {
    execSync(cmd, { stdio: 'ignore' });
    console.log(`-> Completed: chimera_video_${m.id}.mp4 (15.0s continuous growth)`);
  } catch (err) {
    console.error(`Error rendering ${m.id}:`, err.message);
  }
}

console.log('All 12 continuous growth videos rendered successfully!');
