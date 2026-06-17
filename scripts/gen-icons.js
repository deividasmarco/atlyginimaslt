// One-off asset generator. Run: node scripts/gen-icons.js
// Builds all app icons from assets/logo-source.png.png
const sharp = require('sharp');
const path = require('path');

const A = path.join(__dirname, '..', 'assets');
const SRC = path.join(A, 'logo-source.png.png');
const DARK = { r: 8, g: 12, b: 20, alpha: 1 }; // #080C14 app background

// White "A" silhouette for Android notification icon (must be monochrome+alpha).
const notifSVG = `
<svg width="96" height="96" viewBox="0 0 96 96" xmlns="http://www.w3.org/2000/svg">
  <text x="48" y="60" font-family="Arial, Helvetica, sans-serif" font-size="74"
        font-weight="900" fill="#FFFFFF" text-anchor="middle" dominant-baseline="middle">A</text>
</svg>`;

async function main() {
  // iOS / general: full-bleed square, no transparency (iOS adds its own mask).
  await sharp(SRC).resize(1024, 1024, { fit: 'cover' })
    .flatten({ background: { r: 0, g: 0, b: 0 } })
    .png().toFile(path.join(A, 'icon.png'));
  console.log('icon.png');

  // Android adaptive foreground: logo on dark canvas with safe-zone padding.
  const fg = await sharp(SRC).resize(760, 760, { fit: 'contain',
    background: { r: 0, g: 0, b: 0, alpha: 0 } }).toBuffer();
  await sharp({ create: { width: 1024, height: 1024, channels: 4, background: DARK } })
    .composite([{ input: fg, gravity: 'center' }])
    .png().toFile(path.join(A, 'adaptive-icon.png'));
  console.log('adaptive-icon.png');

  // Splash: logo centered on dark background.
  const splashLogo = await sharp(SRC).resize(560, 560, { fit: 'contain',
    background: { r: 0, g: 0, b: 0, alpha: 0 } }).toBuffer();
  await sharp({ create: { width: 1242, height: 1242, channels: 4, background: DARK } })
    .composite([{ input: splashLogo, gravity: 'center' }])
    .png().toFile(path.join(A, 'splash.png'));
  console.log('splash.png');

  // Notification icon (Android): white silhouette.
  await sharp(Buffer.from(notifSVG)).resize(96, 96).png().toFile(path.join(A, 'notification-icon.png'));
  console.log('notification-icon.png');

  // Web favicon.
  await sharp(SRC).resize(48, 48, { fit: 'cover' })
    .flatten({ background: { r: 0, g: 0, b: 0 } })
    .png().toFile(path.join(A, 'favicon.png'));
  console.log('favicon.png');

  console.log('done');
}
main().catch(e => { console.error(e); process.exit(1); });
