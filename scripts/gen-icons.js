// One-off asset generator. Run: node scripts/gen-icons.js
// Produces app icons from inline SVG (no external design files needed).
const sharp = require('sharp');
const path = require('path');

const A = path.join(__dirname, '..', 'assets');

// Full-bleed iOS / general icon: gradient square with a bold euro mark.
const iconSVG = `
<svg width="1024" height="1024" viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#3B82F6"/>
      <stop offset="1" stop-color="#7C5CFF"/>
    </linearGradient>
  </defs>
  <rect width="1024" height="1024" fill="url(#g)"/>
  <circle cx="512" cy="512" r="330" fill="#FFFFFF" fill-opacity="0.10"/>
  <text x="512" y="556" font-family="Arial, Helvetica, sans-serif" font-size="620"
        font-weight="800" fill="#FFFFFF" text-anchor="middle" dominant-baseline="middle">€</text>
</svg>`;

// Android adaptive foreground: euro mark on transparent, inside the safe zone.
const adaptiveSVG = `
<svg width="1024" height="1024" viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg">
  <text x="512" y="556" font-family="Arial, Helvetica, sans-serif" font-size="470"
        font-weight="800" fill="#FFFFFF" text-anchor="middle" dominant-baseline="middle">€</text>
</svg>`;

// Notification icon: white silhouette on transparent.
const notifSVG = `
<svg width="96" height="96" viewBox="0 0 96 96" xmlns="http://www.w3.org/2000/svg">
  <text x="48" y="56" font-family="Arial, Helvetica, sans-serif" font-size="64"
        font-weight="800" fill="#FFFFFF" text-anchor="middle" dominant-baseline="middle">€</text>
</svg>`;

// Splash: euro mark centered on the app background color.
const splashSVG = `
<svg width="1242" height="1242" viewBox="0 0 1242 1242" xmlns="http://www.w3.org/2000/svg">
  <rect width="1242" height="1242" fill="#080C14"/>
  <text x="621" y="675" font-family="Arial, Helvetica, sans-serif" font-size="420"
        font-weight="800" fill="#4F8EF7" text-anchor="middle" dominant-baseline="middle">€</text>
</svg>`;

async function render(svg, file, size) {
  await sharp(Buffer.from(svg)).resize(size, size).png().toFile(path.join(A, file));
  console.log('wrote', file);
}

(async () => {
  await render(iconSVG, 'icon.png', 1024);
  await render(adaptiveSVG, 'adaptive-icon.png', 1024);
  await render(notifSVG, 'notification-icon.png', 96);
  await render(splashSVG, 'splash.png', 1242);
  await render(iconSVG, 'favicon.png', 48);
  console.log('done');
})();
