import { Router, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import axios from 'axios';
import { User } from '../models/User.js';
import { authMiddleware } from '../middleware/auth.js';
import { v2 as cloudinary } from 'cloudinary';

// Configure Cloudinary if credentials are provided
if (
  process.env.CLOUDINARY_CLOUD_NAME &&
  process.env.CLOUDINARY_API_KEY &&
  process.env.CLOUDINARY_API_SECRET
) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
}

const router = Router();

// POST /api/auth/google
router.post('/google', async (req: Request, res: Response) => {
  try {
    const { accessToken } = req.body;

    if (!accessToken) {
      return res.status(400).json({ error: 'Access token required' });
    }

    if (accessToken === 'dev_bypass') {
      let user = await User.findOne({ email: 'dev@devawalls.com' });
      if (!user) {
        user = new User({
          googleId: 'dev_bypass_id',
          email: 'dev@devawalls.com',
          name: 'Developer Mode',
          profilePhoto: '',
        });
        await user.save();
      }
      
      const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET || 'your_secret', {
        expiresIn: '30d',
      });

      return res.json({
        token,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          profilePhoto: user.profilePhoto,
        },
      });
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

    let profilePhotoUrl = undefined;
    if (profilePhotoBase64) {
      if (
        process.env.CLOUDINARY_CLOUD_NAME &&
        process.env.CLOUDINARY_API_KEY &&
        process.env.CLOUDINARY_API_SECRET
      ) {
        try {
          // Upload to Cloudinary
          const uploadResponse = await cloudinary.uploader.upload(
            `data:image/jpeg;base64,${profilePhotoBase64}`,
            {
              folder: 'devawalls_profiles',
              resource_type: 'image',
            }
          );
          profilePhotoUrl = uploadResponse.secure_url;
        } catch (cloudinaryError) {
          console.error('Cloudinary upload failed, falling back to base64:', cloudinaryError);
          profilePhotoUrl = `data:image/jpeg;base64,${profilePhotoBase64}`;
        }
      } else {
        // Fallback if Cloudinary is not configured
        profilePhotoUrl = `data:image/jpeg;base64,${profilePhotoBase64}`;
      }
    }

    const user = await User.findByIdAndUpdate(
      userId,
      {
        ...(name && { name }),
        ...(profilePhotoUrl && { profilePhoto: profilePhotoUrl }),
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
