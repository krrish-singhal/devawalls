import { Router, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { OAuth2Client } from 'google-auth-library';
import { v2 as cloudinary } from 'cloudinary';
import axios from 'axios';
import { User, IUser } from '../models/User.js';
import { authMiddleware } from '../middleware/auth.js';

// ─── Cloudinary Configuration ────────────────────────────────────────────────
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
  console.log('Cloudinary configured');
}

// ─── Google OAuth2 Client ─────────────────────────────────────────────────────
const googleClient = new OAuth2Client(process.env.GOOGLE_WEB_CLIENT_ID);

const router = Router();

// ─── Helper: Upload URL image to Cloudinary ───────────────────────────────────
async function uploadGooglePhotoToCloudinary(photoUrl: string, userId: string): Promise<string> {
  try {
    if (
      !process.env.CLOUDINARY_CLOUD_NAME ||
      !process.env.CLOUDINARY_API_KEY ||
      !process.env.CLOUDINARY_API_SECRET
    ) {
      console.warn('Cloudinary not configured, using Google photo URL directly');
      return photoUrl;
    }

    // Download the image buffer from Google
    const response = await axios.get(photoUrl, { responseType: 'arraybuffer', timeout: 8000 });
    const buffer = Buffer.from(response.data as ArrayBuffer);
    const base64 = buffer.toString('base64');
    const mimeType = (response.headers['content-type'] as string) || 'image/jpeg';
    const dataUri = `data:${mimeType};base64,${base64}`;

    const result = await cloudinary.uploader.upload(dataUri, {
      folder: 'devawalls_profiles',
      public_id: `google_${userId}`,
      overwrite: true,
      resource_type: 'image',
      transformation: [{ width: 200, height: 200, crop: 'fill', gravity: 'face' }],
    });

    console.log(`Google photo uploaded to Cloudinary: ${result.secure_url}`);
    return result.secure_url;
  } catch (err) {
    console.error('Failed to upload Google photo to Cloudinary, using original URL:', err);
    return photoUrl; // Graceful fallback — never block sign-in
  }
}

// ─── POST /api/auth/google ────────────────────────────────────────────────────
// Receives Google ID token from the mobile app, verifies it cryptographically,
// creates/fetches user, uploads profile photo to Cloudinary, returns JWT.
router.post('/google', async (req: Request, res: Response) => {
  try {
    const { idToken } = req.body;

    console.log('[AUTH] Google sign-in request received');

    if (!idToken) {
      console.error('[AUTH] No idToken in request body');
      return res.status(400).json({ error: 'Google ID token is required' });
    }

    // ── Verify Google ID token cryptographically ──────────────────────────────
    console.log('[AUTH] Verifying Google ID token...');
    let payload: Record<string, any>;
    try {
      const ticket = await googleClient.verifyIdToken({
        idToken,
        audience: [
          process.env.GOOGLE_WEB_CLIENT_ID!,
          process.env.GOOGLE_ANDROID_CLIENT_ID!, // Also accept Android client ID
        ].filter(Boolean),
      });
      const p = ticket.getPayload();
      if (!p) throw new Error('Empty payload from Google');
      payload = p;
    } catch (verifyErr: any) {
      console.error('[AUTH] Google token verification failed:', verifyErr.message);
      return res.status(401).json({ error: 'Invalid or expired Google token' });
    }

    // Validate issuer
    if (payload.iss !== 'accounts.google.com' && payload.iss !== 'https://accounts.google.com') {
      console.error('[AUTH] Invalid token issuer:', payload.iss);
      return res.status(401).json({ error: 'Invalid token issuer' });
    }

    const googleId = payload.sub as string;
    const email = payload.email as string;
    const name = payload.name as string | undefined;
    const picture = payload.picture as string | undefined;

    if (!googleId || !email) {
      return res.status(401).json({ error: 'Incomplete Google profile data' });
    }

    console.log(`[AUTH] Google token verified for: ${email}`);

    // ── Find or create user ───────────────────────────────────────────────────
    let finalUser: IUser;
    const existingUser = await User.findOne({ googleId });

    if (!existingUser) {
      console.log(`[AUTH] Creating new user: ${email}`);

      // Upload Google profile photo to Cloudinary for new users
      let profilePhotoUrl = picture || '';
      if (picture) {
        profilePhotoUrl = await uploadGooglePhotoToCloudinary(picture, googleId);
      }

      const newUser = new User({
        googleId,
        email,
        name: name || '',
        profilePhoto: profilePhotoUrl,
      });
      await newUser.save();
      finalUser = newUser;
      console.log(`[AUTH] New user created with id: ${finalUser._id}`);
    } else {
      console.log(`[AUTH] Existing user logged in: ${email}`);

      // If user still has raw Google URL (not Cloudinary), migrate it now
      if (
        picture &&
        existingUser.profilePhoto &&
        existingUser.profilePhoto.includes('googleusercontent.com')
      ) {
        console.log('[AUTH] Migrating Google photo to Cloudinary...');
        const newPhoto = await uploadGooglePhotoToCloudinary(picture, googleId);
        if (newPhoto !== picture) {
          existingUser.profilePhoto = newPhoto;
          await existingUser.save();
        }
      }

      finalUser = existingUser;
    }

    // ── Generate application JWT ──────────────────────────────────────────────
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      console.error('[AUTH] JWT_SECRET is not set');
      return res.status(500).json({ error: 'Server configuration error' });
    }

    const token = jwt.sign(
      { id: finalUser._id.toString(), email: finalUser.email },
      jwtSecret,
      { expiresIn: '30d' }
    );

    console.log(`[AUTH] JWT generated for user: ${finalUser._id}`);

    return res.json({
      token,
      user: {
        id: finalUser._id.toString(),
        name: finalUser.name,
        email: finalUser.email,
        profilePhoto: finalUser.profilePhoto,
      },
    });
  } catch (error: any) {
    console.error('[AUTH] Unexpected error during Google auth:', error);
    return res.status(500).json({ error: 'Authentication failed. Please try again.' });
  }
});

// ─── PATCH /api/auth/profile ──────────────────────────────────────────────────
router.patch('/profile', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { name, profilePhotoBase64 } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    let profilePhotoUrl: string | undefined;

    if (profilePhotoBase64) {
      if (
        process.env.CLOUDINARY_CLOUD_NAME &&
        process.env.CLOUDINARY_API_KEY &&
        process.env.CLOUDINARY_API_SECRET
      ) {
        try {
          const uploadResponse = await cloudinary.uploader.upload(
            `data:image/jpeg;base64,${profilePhotoBase64}`,
            {
              folder: 'devawalls_profiles',
              public_id: `user_${userId}`,
              overwrite: true,
              resource_type: 'image',
              transformation: [{ width: 200, height: 200, crop: 'fill' }],
            }
          );
          profilePhotoUrl = uploadResponse.secure_url;
          console.log(`[PROFILE] Photo uploaded to Cloudinary: ${profilePhotoUrl}`);
        } catch (cloudinaryError) {
          console.error('[PROFILE] Cloudinary upload failed:', cloudinaryError);
          profilePhotoUrl = `data:image/jpeg;base64,${profilePhotoBase64}`;
        }
      } else {
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

    return res.json({
      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        profilePhoto: user.profilePhoto,
      },
    });
  } catch (error) {
    console.error('[PROFILE] Profile update error:', error);
    return res.status(500).json({ error: 'Profile update failed' });
  }
});

export default router;
