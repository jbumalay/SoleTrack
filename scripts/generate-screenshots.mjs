import sharp from 'sharp';

const svgWide = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720" viewBox="0 0 1280 720">
  <rect width="1280" height="720" fill="#ffffff"/>
  <g transform="translate(640,320)">
    <rect x="-80" y="-80" width="160" height="160" rx="40" fill="#ffffff" stroke="#e5e7eb" stroke-width="6"/>
    <text x="-15" y="25" text-anchor="middle" fill="#000000" font-family="Arial,Helvetica,sans-serif" font-weight="900" font-size="100">S</text>
    <text x="25" y="25" text-anchor="middle" fill="#f97316" font-family="Arial,Helvetica,sans-serif" font-weight="900" font-size="100">T</text>
  </g>
  <text x="640" y="440" text-anchor="middle" fill="#000000" font-family="Arial,Helvetica,sans-serif" font-size="48" font-weight="900">SoleTrack</text>
  <text x="640" y="490" text-anchor="middle" fill="#6b7280" font-family="Arial,Helvetica,sans-serif" font-size="20">Bicol Heritage Footwear</text>
</svg>`);

const svgNarrow = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="720" height="1280" viewBox="0 0 720 1280">
  <rect width="720" height="1280" fill="#ffffff"/>
  <g transform="translate(360,400)">
    <rect x="-100" y="-100" width="200" height="200" rx="50" fill="#ffffff" stroke="#e5e7eb" stroke-width="8"/>
    <text x="-20" y="30" text-anchor="middle" fill="#000000" font-family="Arial,Helvetica,sans-serif" font-weight="900" font-size="130">S</text>
    <text x="35" y="30" text-anchor="middle" fill="#f97316" font-family="Arial,Helvetica,sans-serif" font-weight="900" font-size="130">T</text>
  </g>
  <text x="360" y="560" text-anchor="middle" fill="#000000" font-family="Arial,Helvetica,sans-serif" font-size="60" font-weight="900">SoleTrack</text>
  <text x="360" y="620" text-anchor="middle" fill="#6b7280" font-family="Arial,Helvetica,sans-serif" font-size="24">Bicol Heritage Footwear</text>
</svg>`);

async function main() {
  await sharp(svgWide).png().toFile('public/screenshot-wide.png');
  console.log('Created public/screenshot-wide.png (1280x720)');
  await sharp(svgNarrow).png().toFile('public/screenshot-narrow.png');
  console.log('Created public/screenshot-narrow.png (720x1280)');
}

main().catch(console.error);