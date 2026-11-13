const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const publicDir = path.join(__dirname, '..', 'public');
const videosDir = path.join(publicDir, 'videos');
if (!fs.existsSync(videosDir)) {
  fs.mkdirSync(videosDir, { recursive: true });
}

function renderChimeraVideo(name, jumpscareImg) {
  const img1 = path.join(publicDir, 'images', 'chimera_bioreactor_master.jpg').replace(/\\/g, '/');
  const img2 = path.join(publicDir, 'images', 'chimera_awakened_roar.jpg').replace(/\\/g, '/');
  const img3 = path.join(publicDir, 'images', jumpscareImg).replace(/\\/g, '/');
  const outFile = path.join(videosDir, `${name}.mp4`).replace(/\\/g, '/');

  // Shot 1 (0s-2.5s): Emerging in murky amniotic fluid, slow creep in
  // Shot 2 (2.5s-4.8s): Awakening & Roar, lighting flash, eyes glow
  // Shot 3 (4.8s-7.2s): VIOLENT FORWARD LUNGE! Monster leaps straight forward out of screen!
  const filter = `
    [0:v]scale=1280:720:force_original_aspect_ratio=increase,crop=1280:720,setsar=1,zoompan=z='min(zoom+0.002,1.25)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=75:s=1280x720:fps=30,fade=t=in:st=0:d=0.4,fade=t=out:st=2.1:d=0.4,setsar=1[v0];
    [1:v]scale=1280:720:force_original_aspect_ratio=increase,crop=1280:720,setsar=1,zoompan=z='min(zoom+0.0035,1.35)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=75:s=1280x720:fps=30,fade=t=in:st=0:d=0.3,fade=t=out:st=2.2:d=0.3,setsar=1[v1];
    [2:v]scale=1280:720:force_original_aspect_ratio=increase,crop=1280:720,setsar=1,zoompan=z='min(1.0+pow(on/45,2.5)*2.8,4.0)':x='iw/2-(iw/zoom/2)+sin(on*4)*15':y='ih/2-(ih/zoom/2)+cos(on*5)*12':d=75:s=1280x720:fps=30,fade=t=in:st=0:d=0.15,setsar=1[v2];
    [v0][v1][v2]concat=n=3:v=1:a=0[vout]
  `.replace(/\s+/g, ' ').trim();

  const cmd = `ffmpeg -y -loop 1 -t 2.5 -i "${img1}" -loop 1 -t 2.5 -i "${img2}" -loop 1 -t 2.5 -i "${img3}" -filter_complex "${filter}" -map "[vout]" -c:v libx264 -preset fast -crf 20 -pix_fmt yuv420p -r 30 -movflags +faststart "${outFile}"`;

  console.log(`Rendering ${name}...`);
  execSync(cmd, { stdio: 'inherit' });
  console.log(`Saved: ${outFile}`);
}

try {
  renderChimeraVideo('chimera_awakening_dragon', 'chimera_jumpscare_dragon.jpg');
  renderChimeraVideo('chimera_awakening_cyber', 'chimera_jumpscare_cyber.jpg');
} catch (err) {
  console.error('Rendering error:', err.message);
}
