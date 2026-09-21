const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const srcImg = 'C:/Users/liony/.gemini/antigravity/brain/895bc00d-b3a4-4ffc-8a19-dda8030c0565/isoko_app_icon_1789959074902.jpg';

async function generate() {
  // 1. Extract the centered emblem region (664x664) from srcImg
  const masterBuffer = await sharp(srcImg)
    .extract({ left: 180, top: 200, width: 664, height: 664 })
    .resize(1024, 1024, { fit: 'cover' })
    .png()
    .toBuffer();

  // 2. Generate maskable version (emblem inset on emerald background)
  const maskableBuffer = await sharp({
    create: {
      width: 1024,
      height: 1024,
      channels: 4,
      background: { r: 6, g: 55, b: 48, alpha: 1 }
    }
  })
  .composite([{
    input: await sharp(masterBuffer).resize(800, 800).toBuffer(),
    gravity: 'center'
  }])
  .png()
  .toBuffer();

  // 3. Save PWA icons in mesh-pwa/public
  const pwaDir = path.resolve('public');
  await sharp(masterBuffer).resize(512, 512).toFile(path.join(pwaDir, 'icon-512.png'));
  await sharp(masterBuffer).resize(512, 512).toFile(path.join(pwaDir, 'icon-512-v3.png'));
  await sharp(masterBuffer).resize(192, 192).toFile(path.join(pwaDir, 'icon-192.png'));
  await sharp(masterBuffer).resize(192, 192).toFile(path.join(pwaDir, 'icon-192-v3.png'));
  
  await sharp(maskableBuffer).resize(512, 512).toFile(path.join(pwaDir, 'icon-maskable-512.png'));
  await sharp(maskableBuffer).resize(512, 512).toFile(path.join(pwaDir, 'icon-maskable-512-v3.png'));
  await sharp(maskableBuffer).resize(192, 192).toFile(path.join(pwaDir, 'icon-maskable-192.png'));
  await sharp(maskableBuffer).resize(192, 192).toFile(path.join(pwaDir, 'icon-maskable-192-v3.png'));

  await sharp(masterBuffer).resize(180, 180).toFile(path.join(pwaDir, 'apple-touch-icon.png'));
  await sharp(masterBuffer).resize(180, 180).toFile(path.join(pwaDir, 'apple-touch-icon-v3.png'));
  await sharp(masterBuffer).resize(64, 64).toFile(path.join(pwaDir, 'favicon-v3.png'));
  await sharp(masterBuffer).resize(32, 32).toFile(path.join(pwaDir, 'favicon.ico'));

  console.log('PWA icons written successfully.');

  // 4. Save Android mipmaps in mesh-android/android/app/src/main/res
  const androidRes = path.resolve('../mesh-android/android/app/src/main/res');
  const densities = [
    { dir: 'mipmap-mdpi', size: 48, bgSize: 108 },
    { dir: 'mipmap-hdpi', size: 72, bgSize: 162 },
    { dir: 'mipmap-xhdpi', size: 96, bgSize: 216 },
    { dir: 'mipmap-xxhdpi', size: 144, bgSize: 324 },
    { dir: 'mipmap-xxxhdpi', size: 192, bgSize: 432 },
    { dir: 'mipmap-ldpi', size: 36, bgSize: 81 }
  ];

  for (const d of densities) {
    const targetDir = path.join(androidRes, d.dir);
    if (!fs.existsSync(targetDir)) continue;

    // Standard square launcher
    await sharp(masterBuffer).resize(d.size, d.size).toFile(path.join(targetDir, 'ic_launcher.png'));
    
    // Round launcher (circular masked)
    const radius = d.size / 2;
    const circleSvg = Buffer.from(`<svg width="${d.size}" height="${d.size}"><circle cx="${radius}" cy="${radius}" r="${radius}" fill="#fff" /></svg>`);
    await sharp(masterBuffer)
      .resize(d.size, d.size)
      .composite([{ input: circleSvg, blend: 'dest-in' }])
      .png()
      .toFile(path.join(targetDir, 'ic_launcher_round.png'));

    // Adaptive foreground:
    // Notice earlier we saw in `mesh-android/android/app/src/main/res`:
    // ic_launcher_foreground.png sizes were actually d.size (e.g. 48, 72, 96, 144, 192)!
    // Let's also create foreground at d.size as well as bgSize if needed.
    // Earlier:
    // hdpi: ic_launcher_foreground.png was 72x72
    // mdpi: 48x48
    // xhdpi: 96x96
    // xxhdpi: 144x144
    // xxxhdpi: 192x192
    // And in mipmap-anydpi-v26/ic_launcher.xml:
    // <foreground><inset android:drawable="@mipmap/ic_launcher_foreground" android:inset="16.7%" /></foreground>
    // So ic_launcher_foreground is inset by 16.7% inside the 108dp viewport!
    // Therefore, ic_launcher_foreground should have the emblem scaled with full crisp detail.
    await sharp(masterBuffer)
      .resize(d.size, d.size)
      .toFile(path.join(targetDir, 'ic_launcher_foreground.png'));

    // Adaptive background (deep emerald)
    await sharp({
      create: {
        width: d.bgSize,
        height: d.bgSize,
        channels: 4,
        background: { r: 6, g: 55, b: 48, alpha: 1 }
      }
    })
    .png()
    .toFile(path.join(targetDir, 'ic_launcher_background.png'));
  }

  // Remove old vector foreground so adaptive icon uses mipmap raster cleanly
  const oldVector = path.join(androidRes, 'drawable-v24/ic_launcher_foreground.xml');
  if (fs.existsSync(oldVector)) {
    fs.unlinkSync(oldVector);
    console.log('Removed old vector drawable-v24/ic_launcher_foreground.xml');
  }

  console.log('Android mipmaps written successfully.');
}

generate().catch(console.error);
