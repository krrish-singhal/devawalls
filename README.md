# Deva Walls - Hindu God Wallpaper App

A complete production-ready React Native Expo mobile app with a Node.js/Express backend, built with exact specifications for Android.

## Quick Start

### Frontend Setup

```bash
# Install dependencies
pnpm install

# Create .env file
cp .env.example .env

# Update .env with your Google Android Client ID
# EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID=your_client_id
# EXPO_PUBLIC_API_URL=http://10.0.2.2:4000/api  # for emulator
# or http://192.168.X.X:4000/api for physical device

# Start dev server
pnpm dev

# Or for Android emulator specifically
npx expo start --android
```

### Backend Setup

```bash
# Navigate to backend
cd backend

# Install dependencies
pnpm install

# Create .env file
cp .env.example .env

# Update .env
# PORT=4000
# MONGODB_URI=mongodb://localhost:27017/devawalls (optional)
# JWT_SECRET=generate_a_long_random_string
# API_BASE_URL=http://localhost:4000

# Start development server
pnpm dev
```

## Tech Stack

### Frontend
- **Expo 51** - React Native framework
- **NativeWind v4** - Tailwind CSS for React Native
- **Expo Router** - File-based routing
- **TanStack Query** - Data fetching and caching
- **Zustand** - State management
- **Expo Image** - Optimized image handling
- **React Native Reanimated** - Animations
- **React Native View Shot** - Image capture for customization

### Backend
- **Express.js** - Web framework
- **MongoDB + Mongoose** - Database (optional)
- **JWT** - Authentication
- **Helmet** - Security headers
- **CORS** - Cross-origin support

## Project Structure

```
deva-walls/
├── app/                          # Expo Router screens
│   ├── _layout.tsx              # Root layout with providers
│   ├── index.tsx                # Entry point / redirect logic
│   ├── splash.tsx               # Brand splash screen
│   ├── (auth)/
│   │   ├── _layout.tsx
│   │   └── login.tsx            # Google Sign In screen
│   ├── (onboarding)/
│   │   ├── _layout.tsx
│   │   └── profile-setup.tsx    # Name + photo setup
│   ├── (tabs)/
│   │   ├── _layout.tsx
│   │   └── index.tsx            # Home screen with all sections
│   ├── category/
│   │   └── [id].tsx             # 50 wallpapers per category
│   └── wallpaper/
│       └── [id].tsx             # Preview + customize screen
│
├── src/
│   ├── components/              # Shared UI components
│   │   ├── WallpaperCard.tsx
│   │   ├── CategoryCircle.tsx
│   │   ├── SkeletonCard.tsx
│   │   └── CustomizeOverlay.tsx
│   ├── stores/                  # Zustand stores
│   │   ├── authStore.ts
│   │   └── userStore.ts
│   ├── api/                     # API clients
│   │   ├── client.ts
│   │   ├── wallpapers.api.ts
│   │   └── auth.api.ts
│   ├── hooks/
│   │   └── useWallpapers.ts
│   ├── types/
│   │   └── index.ts
│   └── constants/
│       └── categories.ts
│
├── backend/
│   └── src/
│       ├── index.ts             # Express server
│       ├── config/
│       │   └── db.ts            # MongoDB connection
│       ├── models/
│       │   ├── User.ts
│       │   └── Wallpaper.ts
│       ├── routes/
│       │   ├── auth.ts          # Auth endpoints
│       │   └── wallpapers.ts    # Wallpaper endpoints
│       └── middleware/
│           └── auth.ts          # JWT middleware
│
├── public/
│   └── wallpapers/              # Static wallpaper images
│       ├── shiv/
│       ├── ram/
│       ├── ganesh/
│       ├── maa_durga/
│       ├── hanuman/
│       └── krishna/
│
├── global.css                   # Tailwind CSS imports
├── tailwind.config.js           # Tailwind theme config
├── babel.config.js              # NativeWind babel setup
├── metro.config.js              # Metro bundler config
├── app.json                     # Expo app config
└── tsconfig.json                # TypeScript config
```

## Features

### Screens

1. **Login Screen** - Google OAuth sign-in via expo-auth-session
2. **Splash Screen** - Brand splash with animated loader, auto-navigates after 2.5s
3. **Profile Setup** - Name + profile photo upload
4. **Home Screen** - 3 sections:
   - Category circles (6 categories)
   - Featured/Top wallpapers (horizontal scroll)
   - New wallpapers (2-column grid)
5. **Category Screen** - 50 wallpapers in 2-column grid
6. **Wallpaper Detail** - Preview mode with:
   - Full image display
   - Share on WhatsApp (expo-sharing)
   - Download to gallery (expo-media-library)
   - Customize mode
7. **Customize Mode** - Add your photo to wallpaper:
   - Size controls (bigger/smaller)
   - Position controls (up/down/left/right)
   - Photo replacement
   - Save customized wallpaper

### Theme
- **Primary Yellow**: #F5C518
- **Primary Green**: #2D6A2D (buttons, accents)
- **Accent Orange**: #FF8C00
- **Dark Background**: #0F0F0F
- **Card Background**: #1A1A1A

### Wallpapers
- 6 categories: Shiv, Ram, Ganesh, Maa Durga, Hanuman, Krishna
- 50 wallpapers per category (300 total)
- All 9:16 portrait ratio (mobile wallpaper standard)
- Served as static files from Express backend

## API Endpoints

### Authentication
- `POST /api/auth/google` - Google sign-in
- `PATCH /api/user/profile` - Update user profile

### Wallpapers
- `GET /api/wallpapers/featured` - 6 featured wallpapers (1 per category)
- `GET /api/wallpapers/:category` - All 50 wallpapers for a category
- `GET /api/wallpapers?sort=latest&limit=10` - Latest wallpapers

### Static Files
- `GET /wallpapers/:category/:number.jpg` - Serve wallpaper image

## Android Configuration

The app is configured for Android with the following:

- **Package name**: `com.yourname.devawalls`
- **Permissions**:
  - READ_MEDIA_IMAGES
  - WRITE_EXTERNAL_STORAGE
  - READ_EXTERNAL_STORAGE
  - INTERNET
- **Plugins**: expo-router, expo-media-library, expo-image-picker

### To run on Android

```bash
# Start Expo dev server
pnpm dev

# Option 1: Use Android emulator
# - Open Android Studio and start an emulator
# - Press 'a' in terminal

# Option 2: Use physical device
# - Enable USB debugging on your Android phone
# - Connect via USB
# - Run: adb reverse tcp:4000 tcp:4000  (to access backend)
# - Press 'a' in terminal

# Option 3: Use Expo Go app
# - Install Expo Go from Play Store
# - Scan QR code from terminal
```

### Google OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project
3. Enable Google People API
4. Create OAuth 2.0 credentials for Android
5. Get your SHA-1 fingerprint:
   ```bash
   keytool -list -v -keystore ~/.android/debug.keystore -alias androiddebugkey -storepass android -keypass android
   ```
6. Add the Android Client ID to `.env`:
   ```
   EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID=your_client_id
   ```

## Important Notes

### NativeWind Styling
- **All styles use NativeWind `className` props only**
- NO StyleSheet.create() anywhere
- Only `style` prop is used for computed dimensions (Dimensions.get())
- All colors defined in tailwind.config.js

### Image Aspect Ratio
- All wallpapers are 9:16 (portrait)
- WallpaperCard enforces this ratio everywhere
- Expo Image uses `contentFit="cover"` to handle any input image

### State Management
- Use `useAuthStore` for authentication token
- Use `useUserStore` for user profile data
- Use TanStack Query for server data
- AsyncStorage for persistence

### Environment Variables
**Frontend (.env)**:
```
EXPO_PUBLIC_API_URL=http://10.0.2.2:4000/api
EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID=your_client_id
```

**Backend (.env)**:
```
PORT=4000
MONGODB_URI=mongodb://localhost:27017/devawalls
JWT_SECRET=your_super_secret_key
API_BASE_URL=http://localhost:4000
```

## Development Tips

### Hot Reload
- Changes to .ts/.tsx files reload automatically
- Metro bundler watches for changes

### Debugging
- Use `console.log()` which appears in terminal
- Use Expo DevTools: Shake device or Ctrl+M in emulator

### API Testing
- Backend runs on http://localhost:4000
- Test endpoints with curl or Postman
- Static files at http://localhost:4000/wallpapers/

### Common Issues

**"Can't connect to backend"**
- Emulator: Use `http://10.0.2.2:4000` (not localhost)
- Physical device: Use your computer's local IP
- Verify backend is running: `curl http://localhost:4000/health`

**"Image loading fails"**
- Check backend is serving static files
- Verify image path in API response matches file location
- Check image format (JPEG recommended)

**"Tailwind styles not applied"**
- Make sure NativeWind is installed and configured
- Check babel.config.js has correct jsxImportSource
- Ensure global.css is imported in app/_layout.tsx

## Production Deployment

### Frontend
- Build with `eas build --platform android`
- Submit to Google Play Store
- Follow Expo EAS guidelines

### Backend
- Deploy to Heroku, Vercel, or own server
- Set up MongoDB Atlas for database
- Configure environment variables
- Enable CORS for production domain

## License

MIT - Feel free to use and modify

## Support

For issues or questions, check the Expo and Express documentation:
- [Expo Documentation](https://docs.expo.dev)
- [Express Documentation](https://expressjs.com)
- [NativeWind Documentation](https://www.nativewind.dev)
