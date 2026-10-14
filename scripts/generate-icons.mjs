import sharp from 'sharp';
import { readFileSync } from 'fs';

const svg = readFileSync('public/icon-source.svg');

async function generate() {
  for (const size of [192, 512]) {
    await sharp(svg)
      .resize(size, size)
      .png()
      .toFile(`public/pwa-${size}x${size}.png`);
    console.log(`Created public/pwa-${size}x${size}.png`);
  }
}

generate().catch(console.error);
