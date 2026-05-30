import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const CATEGORIES = {
  shiv: '#C70039',
  ram: '#FF5733',
  ganesh: '#FFC300',
  maa_durga: '#FF006E',
  hanuman: '#FB5607',
  krishna: '#3A86FF',
};

async function generateWallpapers() {
  for (const [category, color] of Object.entries(CATEGORIES)) {
    const dir = path.join(process.cwd(), 'public', 'wallpapers', category);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    // Generate 50 wallpapers per category
    for (let i = 1; i <= 50; i++) {
      const filename = path.join(dir, `${i}.jpg`);

      // Create a vertical (9:16) image with gradient and text
      const svg = `
        <svg width="540" height="960" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="grad${i}" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" style="stop-color:${color};stop-opacity:1" />
              <stop offset="100%" style="stop-color:#000000;stop-opacity:1" />
            </linearGradient>
          </defs>
          <rect width="540" height="960" fill="url(#grad${i})"/>
          <text x="270" y="480" font-size="72" fill="#F5C518" text-anchor="middle" font-weight="bold" font-family="Arial">
            🪷
          </text>
          <text x="270" y="600" font-size="48" fill="#FFFFFF" text-anchor="middle" font-weight="bold" font-family="Arial">
            ${category}
          </text>
          <text x="270" y="680" font-size="28" fill="#F5C518" text-anchor="middle" font-family="Arial">
            Wallpaper ${i}
          </text>
        </svg>
      `;

      await sharp(Buffer.from(svg))
        .jpeg({ quality: 85 })
        .toFile(filename);

      console.log(`✓ Created ${category}/${i}.jpg`);
    }
  }

  console.log('\n✅ All wallpapers generated successfully!');
}

generateWallpapers().catch(console.error);
