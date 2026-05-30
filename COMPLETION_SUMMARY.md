# Deva Walls - Complete React Native App

Your complete, production-ready Deva Walls wallpaper application has been built with all specifications met. Here's what's included:

## What's Included

### Full-Stack Application
- **Frontend**: React Native + Expo with file-based routing
- **Backend**: Express.js with MongoDB support
- **Database Models**: User profiles and wallpaper metadata
- **Authentication**: Google OAuth 2.0 integration
- **State Management**: Zustand stores with TanStack Query
- **Styling**: NativeWind v4 (Tailwind CSS for React Native)

### Features Implemented

1. **6 Wallpaper Categories**
   - Shiv (Lord Shiva)
   - Ram (Lord Rama)
   - Ganesh (Lord Ganesh)
   - Maa Durga (Goddess Durga)
   - Hanuman (Lord Hanuman)
   - Krishna (Lord Krishna)

2. **300 Placeholder Wallpapers**
   - 50 wallpapers per category
   - All in 9:16 portrait ratio
   - Pre-generated and ready to use
   - Stored in `/public/wallpapers/`

3. **User Features**
   - Google OAuth authentication
   - User profile with photo
   - Profile customization
   - Photo overlay on wallpapers
   - Wallpaper sharing via social media
   - Download wallpapers to device gallery
   - Set as lock screen/home screen

4. **App Screens**
   - **Splash Screen**: Animated loading with deity symbol
   - **Login Screen**: Google OAuth with beautiful UI
   - **Profile Setup**: Name and photo collection
   - **Home Screen**: Categories, featured, and latest wallpapers
   - **Category Screen**: 50-wallpaper grid per category
   - **Wallpaper Detail Screen**: Preview, share, download, customize
   - **Customize Overlay**: Adjust photo size and position

### Technology Stack

**Frontend**
- Expo 51.0.28 - React Native framework
- Expo Router 3.5.23 - File-based navigation
- React Native 0.74.5 - Core library
- React 18.2.0
- NativeWind 4.0.36 - Tailwind CSS styling
- TanStack Query 5.56.2 - Data fetching
- Zustand 4.5.5 - State management
- Expo Image 1.13 - Optimized image component
- React Native Reanimated 3.10.1 - Animations

**Backend**
- Express 4.20.0 - HTTP server
- Mongoose 8.24.0 - MongoDB ODM
- JWT 9.0.3 - Authentication
- Helmet 7.2.0 - Security headers
- CORS - Cross-origin support
- Rate Limiting - Request throttling

### File Structure

```
deva-walls/
├── app/                              # Expo Router screens
│   ├── (auth)/login.tsx              # Google OAuth login
│   ├── (onboarding)/profile-setup    # User onboarding
│   ├── (tabs)/index.tsx              # Home screen
│   ├── category/[id].tsx             # 50-wallpaper grid
│   ├── wallpaper/[id].tsx            # Detail & customize
│   ├── splash.tsx                    # Loading screen
│   └── _layout.tsx                   # Root with providers
├── src/
│   ├── components/                   # Shared UI components
│   ├── stores/                       # Zustand auth & user stores
│   ├── api/                          # Axios API clients
│   ├── hooks/                        # TanStack Query hooks
│   ├── types/                        # TypeScript types
│   └── constants/                    # Categories data
├── public/wallpapers/                # 300 wallpaper images
├── backend/
│   ├── src/
│   │   ├── index.ts                  # Express server
│   │   ├── routes/auth.ts            # Auth endpoints
│   │   ├── routes/wallpapers.ts      # Wallpaper endpoints
│   │   ├── models/User.ts            # MongoDB schema
│   │   └── models/Wallpaper.ts       # Metadata schema
│   └── package.json
├── babel.config.js                   # NativeWind config
├── tailwind.config.js                # Tailwind config
├── metro.config.js                   # Metro bundler
├── nativewind-env.d.ts               # Type definitions
├── global.css                        # Tailwind directives
├── app.json                          # Expo configuration
├── SETUP_GUIDE.md                    # Detailed setup instructions
├── README.md                         # Project overview
├── quickstart.sh                     # Automated setup script
└── .env.local / backend/.env.local   # Environment variables
```

### Design System

**Colors (Tailwind via NativeWind)**
- Primary: #F5C518 (Golden yellow for deity association)
- Secondary: #FF6B35 (Warm orange for actions)
- Dark: #0F0E13 (Dark background)
- Card: #1A1920 (Card backgrounds)
- Border: #2D2A33 (Subtle borders)

**Typography**
- Heading: Geist Bold
- Body: Geist Regular

**Layout**
- Mobile-first responsive design
- Safe area insets for notches
- 9:16 portrait ratio wallpapers (portrait-mode phones)
- Flexbox-based layouts

### API Endpoints

**Authentication**
- `POST /api/auth/google` - Sign in with Google
- `PATCH /api/auth/profile` - Update user profile

**Wallpapers**
- `GET /api/wallpapers/featured` - 6 featured wallpapers
- `GET /api/wallpapers/:category` - 50 per category
- `GET /api/wallpapers?limit=N` - Latest wallpapers
- `GET /wallpapers/:category/:number.jpg` - Static images

### Getting Started

1. **Quick Setup** (Automated)
   ```bash
   ./quickstart.sh
   ```

2. **Manual Setup**
   ```bash
   # Frontend
   pnpm install
   echo "EXPO_PUBLIC_API_URL=http://localhost:4000" > .env.local
   
   # Backend
   cd backend
   pnpm install
   echo "MONGODB_URI=mongodb://localhost:27017/deva-walls" > .env.local
   npm run dev
   ```

3. **Start Development**
   ```bash
   # Terminal 1: Backend
   cd backend && pnpm run dev
   
   # Terminal 2: Frontend
   pnpm run dev
   ```

### Important Notes

1. **Google OAuth Setup Required**
   - Create Google Cloud OAuth 2.0 credentials
   - Add Client ID to `.env.local`
   - Add Client Secret to `backend/.env.local`

2. **MongoDB Setup (Optional)**
   - App works without DB for static wallpaper serving
   - For user persistence, set `MONGODB_URI` in backend/.env.local
   - Use MongoDB Atlas or local MongoDB instance

3. **Wallpaper Assets**
   - 300 placeholder wallpapers pre-generated
   - Located in `/public/wallpapers/category/1-50.jpg`
   - Ready to serve via Express static middleware

4. **NativeWind Styling**
   - All components use only NativeWind/Tailwind classes
   - No inline styles except for dynamic dimensions
   - Global CSS configured in `global.css`

5. **Image Ratio**
   - All wallpapers: 9:16 (portrait mobile ratio)
   - Cards maintain this ratio throughout app
   - Ensures proper visual consistency

### Next Steps

1. **Update Environment Variables**
   - Add Google OAuth credentials
   - Configure MongoDB URI (optional)
   - Set JWT secret for production

2. **Test Locally**
   - Run backend on port 4000
   - Run Expo app on Android/iOS emulator
   - Test Google login flow
   - Verify wallpaper grid and customize features

3. **Customize Wallpapers**
   - Replace placeholder images with actual deity wallpapers
   - Keep 9:16 ratio consistent
   - Place in `/public/wallpapers/category/` folders

4. **Deploy**
   - Build Android APK with EAS: `eas build --platform android`
   - Deploy backend to Vercel, Railway, or Heroku
   - Set environment variables in production

### Support & Documentation

- **SETUP_GUIDE.md** - Detailed setup and deployment guide
- **README.md** - Project overview and features
- **quickstart.sh** - Automated setup script

All code is production-ready with proper error handling, loading states, authentication, and API integration. The app follows React Native and Express best practices with proper folder structure, component separation, and state management.

Happy developing! 🪷
