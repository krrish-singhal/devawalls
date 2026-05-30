import { Router, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import axios from 'axios';
import { User } from '../models/User.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();

// POST /api/auth/google
router.post('/google', async (req: Request, res: Response) => {
  try {
    const { accessToken } = req.body;

    if (!accessToken) {
      return res.status(400).json({ error: 'Access token required' });
    }

    // Verify token with Google
    const googleResponse = await axios.get('https://www.googleapis.com/userinfo/v2/me', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    const { id, email, name, picture } = googleResponse.data;

    // Upsert user in MongoDB
    let user = await User.findOne({ googleId: id });
    if (!user) {
      user = new User({
        googleId: id,
        email,
        name: name || '',
        profilePhoto: picture || '',
      });
      await user.save();
    }

    // Sign JWT
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET || 'your_secret', {
      expiresIn: '30d',
    });

    res.json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        profilePhoto: user.profilePhoto,
      },
    });
  } catch (error) {
    console.error('Google auth error:', error);
    res.status(500).json({ error: 'Authentication failed' });
  }
});

// PATCH /api/user/profile
router.patch('/profile', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { name, profilePhotoBase64 } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const user = await User.findByIdAndUpdate(
      userId,
      {
        ...(name && { name }),
        ...(profilePhotoBase64 && { profilePhoto: `data:image/jpeg;base64,${profilePhotoBase64}` }),
      },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        profilePhoto: user.profilePhoto,
      },
    });
  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({ error: 'Profile update failed' });
  }
});

export default router;
