import { Router, Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

import { fileURLToPath } from 'url';

const router = Router();
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const VALID_CATEGORIES = ['shiv', 'ram', 'ganesh', 'maa_durga', 'hanuman', 'krishna'];

// Helper to dynamically construct the base URL from the incoming request headers
const getApiBaseUrl = (req: Request) => {
  const host = req.get('host');
  const protocol = req.protocol;
  return `${protocol}://${host}`;
};

// Helper to get file modification timestamp for cache-busting
const getFileTimestamp = (category: string, filename: string): number => {
  try {
    const filePath = path.resolve(__dirname, '..', '..', '..', 'public', 'wallpapers', category, filename);
    const stats = fs.statSync(filePath);
    return Math.floor(stats.mtimeMs);
  } catch (e) {
    return Date.now(); // Fallback if file doesn't exist
  }
};

// GET /api/wallpapers/thumbnail/:category/:filename
router.get('/thumbnail/:category/:filename', async (req: Request, res: Response) => {
  try {
    const { category, filename } = req.params;
    
    // Resolve source file path
    const sourcePath = path.resolve(__dirname, '..', '..', '..', 'public', 'wallpapers', category, filename);
    
    if (!fs.existsSync(sourcePath)) {
      return res.status(404).json({ error: 'Original image not found' });
    }

    const cacheDir = path.resolve(__dirname, '..', '..', '..', 'public', 'wallpapers', '.cache', category);
    const targetPath = path.join(cacheDir, filename);

    // Create caching directory structure if it doesn't exist
    if (!fs.existsSync(cacheDir)) {
      fs.mkdirSync(cacheDir, { recursive: true });
    }

    // Serve cached thumbnail if it exists and original hasn't changed
    if (fs.existsSync(targetPath)) {
      const originalStats = fs.statSync(sourcePath);
      const cachedStats = fs.statSync(targetPath);
      if (originalStats.mtimeMs <= cachedStats.mtimeMs) {
        return res.sendFile(targetPath);
      }
    }

    // Generate optimized JPEG thumbnail (width 300px, quality 80)
    await sharp(sourcePath)
      .resize(300)
      .jpeg({ quality: 80 })
      .toFile(targetPath);

    return res.sendFile(targetPath);
  } catch (error) {
    console.error('Thumbnail generation failed:', error);
    // Graceful fallback to original image in case of sharp errors
    try {
      const { category, filename } = req.params;
      const sourcePath = path.resolve(__dirname, '..', '..', '..', 'public', 'wallpapers', category, filename);
      if (fs.existsSync(sourcePath)) {
        return res.sendFile(sourcePath);
      }
    } catch (e) {}
    res.status(500).json({ error: 'Failed to generate thumbnail' });
  }
});

// GET /api/wallpapers/featured
router.get('/featured', (req: Request, res: Response) => {
  try {
    const baseUrl = getApiBaseUrl(req);
    const wallpapers = VALID_CATEGORIES.map((category) => {
      const filename = '1.jpg';
      const mtime = getFileTimestamp(category, filename);
      return {
        id: `${category}_1`,
        category,
        imageUrl: `${baseUrl}/wallpapers/${category}/${filename}?v=${mtime}`,
        thumbnailUrl: `${baseUrl}/api/wallpapers/thumbnail/${category}/${filename}?v=${mtime}`,
        title: `${category} wallpaper 1`,
      };
    });
    res.json({ wallpapers });
  } catch (error) {
    console.error('Featured wallpapers error:', error);
    res.status(500).json({ error: 'Failed to fetch featured wallpapers' });
  }
});

// GET /api/wallpapers/:category
router.get('/:category', (req: Request, res: Response) => {
  try {
    const { category } = req.params;

    if (!VALID_CATEGORIES.includes(category)) {
      return res.status(400).json({ error: 'Invalid category' });
    }

    const baseUrl = getApiBaseUrl(req);
    const wallpapers = Array.from({ length: 50 }, (_, i) => {
      const filename = `${i + 1}.jpg`;
      const mtime = getFileTimestamp(category, filename);
      return {
        id: `${category}_${i + 1}`,
        category,
        imageUrl: `${baseUrl}/wallpapers/${category}/${filename}?v=${mtime}`,
        thumbnailUrl: `${baseUrl}/api/wallpapers/thumbnail/${category}/${filename}?v=${mtime}`,
        title: `${category} wallpaper ${i + 1}`,
      };
    });

    res.json({ wallpapers });
  } catch (error) {
    console.error('Category wallpapers error:', error);
    res.status(500).json({ error: 'Failed to fetch wallpapers' });
  }
});

// GET /api/wallpapers - latest wallpapers
router.get('/', (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 10;
    const baseUrl = getApiBaseUrl(req);

    // Generate latest wallpapers: 2 from each category
    const wallpapers = [];
    for (const category of VALID_CATEGORIES) {
      for (let i = 1; i <= 2; i++) {
        const filename = `${i}.jpg`;
        const mtime = getFileTimestamp(category, filename);
        wallpapers.push({
          id: `${category}_${i}`,
          category,
          imageUrl: `${baseUrl}/wallpapers/${category}/${filename}?v=${mtime}`,
          thumbnailUrl: `${baseUrl}/api/wallpapers/thumbnail/${category}/${filename}?v=${mtime}`,
          title: `${category} wallpaper ${i}`,
        });
      }
    }

    res.json({ wallpapers: wallpapers.slice(0, limit) });
  } catch (error) {
    console.error('Latest wallpapers error:', error);
    res.status(500).json({ error: 'Failed to fetch wallpapers' });
  }
});

export default router;
