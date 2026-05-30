import { Router, Request, Response } from 'express';

const router = Router();
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:4000';
const VALID_CATEGORIES = ['shiv', 'ram', 'ganesh', 'maa_durga', 'hanuman', 'krishna'];

// GET /api/wallpapers/featured
router.get('/featured', (req: Request, res: Response) => {
  try {
    const wallpapers = VALID_CATEGORIES.map((category, index) => ({
      id: `${category}_1`,
      category,
      imageUrl: `${API_BASE_URL}/wallpapers/${category}/1.jpg`,
      thumbnailUrl: `${API_BASE_URL}/wallpapers/${category}/1.jpg`,
      title: `${category} wallpaper 1`,
    }));
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

    const wallpapers = Array.from({ length: 50 }, (_, i) => ({
      id: `${category}_${i + 1}`,
      category,
      imageUrl: `${API_BASE_URL}/wallpapers/${category}/${i + 1}.jpg`,
      thumbnailUrl: `${API_BASE_URL}/wallpapers/${category}/${i + 1}.jpg`,
      title: `${category} wallpaper ${i + 1}`,
    }));

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

    // Generate latest wallpapers: 2 from each category
    const wallpapers = [];
    for (const category of VALID_CATEGORIES) {
      for (let i = 1; i <= 2; i++) {
        wallpapers.push({
          id: `${category}_${i}`,
          category,
          imageUrl: `${API_BASE_URL}/wallpapers/${category}/${i}.jpg`,
          thumbnailUrl: `${API_BASE_URL}/wallpapers/${category}/${i}.jpg`,
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
