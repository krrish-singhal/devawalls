## Deva Walls - Complete Setup & Deployment Guide

### Project Overview
Deva Walls is a full-stack React Native + Express wallpaper app with:
- 6 deity wallpaper categories (Shiv, Ram, Ganesh, Maa Durga, Hanuman, Krishna)
- 50 wallpapers per category (300 total in 9:16 portrait ratio)
- User authentication via Google OAuth
- Profile customization with photo overlay on wallpapers
- Wallpaper sharing, downloading, and preview features
- Express backend with MongoDB support

### Directory Structure
```
deva-walls/
├── app/                          # Expo Router app screens
│   ├── (auth)/                   # Authentication screens
│   │   └── login.tsx
│   ├── (onboarding)/             # Onboarding screens
│   │   └── profile-setup.tsx
│   ├── (tabs)/                   # Main app screens
│   │   └── index.tsx (home)
│   ├── category/[id].tsx         # Category grid (50 wallpapers)
│   ├── wallpaper/[id].tsx        # Wallpaper detail/customize screen
│   ├── splash.tsx                # Loading splash
│   └── _layout.tsx               # Root layout with providers
├── src/
│   ├── components/               # Reusable components
│   │   ├── WallpaperCard.tsx
│   │   ├── CategoryCircle.tsx
│   │   ├── SkeletonCard.tsx
│   │   └── CustomizeOverlay.tsx
│   ├── stores/                   # Zustand state management
│   │   ├── authStore.ts
│   │   └── userStore.ts
│   ├── api/                      # API clients
│   │   ├── client.ts
│   │   ├── auth.api.ts
│   │   └── wallpapers.api.ts
│   ├── hooks/                    # Custom hooks
│   │   └── useWallpapers.ts (TanStack Query)
│   ├── types/                    # TypeScript types
│   │   └── index.ts
│   └── constants/                # Constants
│       └── categories.ts
├── public/wallpapers/            # Wallpaper images (300 total)
│   ├── shiv/1-50.jpg
│   ├── ram/1-50.jpg
│   ├── ganesh/1-50.jpg
│   ├── maa_durga/1-50.jpg
│   ├── hanuman/1-50.jpg
│   └── krishna/1-50.jpg
├── backend/                      # Express server
│   ├── src/
│   │   ├── index.ts              # Express app setup
│   │   ├── config/
│   │   │   └── db.ts             # MongoDB connection
│   │   ├── models/
│   │   │   ├── User.ts
│   │   │   └── Wallpaper.ts
│   │   ├── routes/
│   │   │   ├── auth.ts           # Google OAuth, profile
│   │   │   └── wallpapers.ts     # Wallpaper endpoints
│   │   └── middleware/
│   │       └── auth.ts           # JWT auth middleware
│   ├── package.json
│   ├── tsconfig.json
│   └── .env.local
├── babel.config.js               # NativeWind setup
├── metro.config.js               # React Native bundler
├── tailwind.config.js            # Tailwind for NativeWind
├── nativewind-env.d.ts           # NativeWind types
├── global.css                    # Global Tailwind styles
└── .env.local
```

### Prerequisites
- Node.js 18+
- pnpm (or npm/yarn)
- MongoDB (local or Atlas connection string)
- Google OAuth credentials (for login)
- Android SDK or Xcode (for emulator/device testing)

### Installation & Setup

#### 1. Frontend Setup
```bash
cd /path/to/deva-walls

# Install dependencies
pnpm install

# Generate placeholder wallpapers (optional, already done)
pnpm run generate-wallpapers

# Create .env.local with Google OAuth credentials
cat > .env.local << 'EOF'
EXPO_PUBLIC_API_URL=http://localhost:4000
EXPO_PUBLIC_GOOGLE_CLIENT_ID=your_google_client_id.apps.googleusercontent.com
EOF
```

#### 2. Backend Setup
```bash
cd backend

# Install dependencies
pnpm install

# Create .env.local with MongoDB connection
cat > .env.local << 'EOF'
MONGODB_URI=mongodb://localhost:27017/deva-walls
JWT_SECRET=your_jwt_secret_key_change_this
PORT=4000
GOOGLE_CLIENT_SECRET=your_google_client_secret_here
API_BASE_URL=http://localhost:4000
NODE_ENV=development
EOF

# Start the server
pnpm run dev
# or: npx tsx src/index.ts
```

#### 3. Get Google OAuth Credentials
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable Google+ API
4. Create OAuth 2.0 credentials (OAuth Consent Screen)
5. Add authorized redirect URIs:
   - For Android: `com.deva.walls://oauth`
   - For iOS: `com.deva.walls://oauth`
   - For web testing: `http://localhost:3000/callback`
6. Copy Client ID and Client Secret to .env files

### Running the App

#### Android Development
```bash
# Terminal 1: Start backend
cd backend && pnpm run dev

# Terminal 2: Start Expo (Android)
pnpm run dev
# Select 'a' for Android emulator or scan QR with Expo Go app
```

#### iOS Development
```bash
# Terminal 1: Start backend
cd backend && pnpm run dev

# Terminal 2: Start Expo (iOS)
pnpm run dev:ios
```

#### Web Preview (Limited)
```bash
pnpm run dev:web
```

### API Endpoints

#### Authentication
- `POST /api/auth/google` - Sign in with Google
  ```json
  Body: { "accessToken": "google_access_token" }
  Response: { "token": "jwt_token", "user": {...} }
  ```

- `PATCH /api/auth/profile` - Update user profile
  ```json
  Body: { "name": "User Name", "profilePhotoBase64": "base64_data" }
  Response: { "user": {...} }
  ```

#### Wallpapers
- `GET /api/wallpapers/featured` - Get 6 featured wallpapers (1 per category)
- `GET /api/wallpapers/:category` - Get 50 wallpapers from category
- `GET /api/wallpapers?limit=10` - Get latest wallpapers
- `GET /wallpapers/:category/:number.jpg` - Static wallpaper image

### Key Technologies

#### Frontend
- **Expo 51**: React Native framework with managed services
- **Expo Router 3.5**: File-based routing
- **NativeWind 4**: Tailwind CSS for React Native
- **TanStack Query 5**: Data fetching and caching
- **Zustand 4.5**: State management
- **Expo Image**: Optimized image component with caching
- **React Native Reanimated 3**: Animations

#### Backend
- **Express.js**: HTTP server
- **MongoDB + Mongoose**: Database
- **JWT**: Token-based authentication
- **Helmet**: Security headers
- **CORS**: Cross-origin requests
- **Rate Limiting**: Request throttling

### Custom Colors & Styling
All colors use Tailwind CSS (NativeWind) with custom theme:

**Color System** (tailwind.config.js):
- `primary`: #F5C518 (golden yellow - for deity association)
- `secondary`: #FF6B35 (warm orange - action color)
- `dark`: #0F0E13 (dark background)
- `card`: #1A1920 (card background)
- `border`: #2D2A33 (subtle borders)
- `textMuted`: #B0ADB8 (muted text)

### Features Implementation

#### Authentication Flow
1. User opens app → Lands on splash screen
2. If not authenticated → Redirected to Google login
3. On successful login → Routed to profile setup
4. After profile setup → Main app (tabs)

#### Wallpaper Categories
- Shiv (Lord Shiva)
- Ram (Lord Rama)
- Ganesh (Lord Ganesh)
- Maa Durga (Goddess Durga)
- Hanuman (Lord Hanuman)
- Krishna (Lord Krishna)

#### Wallpaper Customization
- Add profile photo with overlay
- Adjust size (bigger/smaller)
- Reposition on wallpaper (up/down/left/right)
- Change or remove photo
- Preview before setting
- Share via social media
- Download to device gallery
- Set as lock screen/home screen

### Environment Configuration

**Frontend (.env.local)**:
```
EXPO_PUBLIC_API_URL=http://localhost:4000
EXPO_PUBLIC_GOOGLE_CLIENT_ID=your_client_id.apps.googleusercontent.com
```

**Backend (.env.local)**:
```
MONGODB_URI=mongodb://localhost:27017/deva-walls
JWT_SECRET=change_this_to_random_string
PORT=4000
GOOGLE_CLIENT_SECRET=your_client_secret
API_BASE_URL=http://localhost:4000
NODE_ENV=development
```

### Building for Production

#### Android Build
```bash
# Install EAS CLI
npm install -g eas-cli

# Login to Expo account
eas login

# Build
eas build --platform android

# Install APK on device
adb install -r build.apk
```

#### iOS Build
```bash
eas build --platform ios
# Follow prompts to build and download .ipa
```

### Troubleshooting

**Backend not connecting**:
- Ensure backend is running on port 4000
- Check API_BASE_URL in frontend .env
- Verify CORS is enabled in Express

**Images not loading**:
- Check wallpaper files exist in `public/wallpapers/`
- Verify static file serving in Express
- Clear Expo cache: `expo start -c`

**Authentication issues**:
- Verify Google OAuth credentials
- Check JWT_SECRET matches between backend calls
- Clear AsyncStorage if persisting invalid tokens

**MongoDB connection**:
- Ensure MongoDB is running locally or Atlas URL is correct
- App works without DB (wallpapers served statically)

### Performance Optimization
- Wallpapers cached with Expo Image caching
- Query results cached with TanStack Query (10min stale time)
- Skeleton loading states during data fetch
- Lazy loading wallpaper grid
- Optimized image sizes (9:16 ratio)

### Next Steps for Enhancement
- Add favorites/bookmarks system
- Implement search functionality
- Add wallpaper ratings/comments
- Cloud backup of user preferences
- Push notifications for new wallpapers
- Dark/light theme toggle
- Multiple language support
- Offline mode for downloaded wallpapers
