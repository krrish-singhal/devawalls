#!/bin/bash

# Deva Walls - Quick Start Script
# This script sets up and runs the Deva Walls app in development mode

set -e

echo "🪷 Deva Walls - Development Setup"
echo "=================================="
echo ""

# Check prerequisites
echo "Checking prerequisites..."
command -v node >/dev/null 2>&1 || { echo "❌ Node.js not found. Please install Node.js 18+"; exit 1; }
command -v pnpm >/dev/null 2>&1 || { echo "⚠️  pnpm not found. Installing pnpm..."; npm install -g pnpm; }

echo "✓ Node.js and pnpm found"
echo ""

# Frontend setup
echo "📱 Setting up Frontend..."
if [ ! -f ".env.local" ]; then
  echo "Creating .env.local..."
  cat > .env.local << 'EOF'
EXPO_PUBLIC_API_URL=http://localhost:4000
EXPO_PUBLIC_GOOGLE_CLIENT_ID=your_google_client_id_here.apps.googleusercontent.com
EOF
  echo "✓ .env.local created (update with your Google OAuth credentials)"
else
  echo "✓ .env.local already exists"
fi

echo "Installing dependencies..."
pnpm install

echo "✓ Frontend setup complete"
echo ""

# Backend setup
echo "⚙️  Setting up Backend..."
cd backend

if [ ! -f ".env.local" ]; then
  echo "Creating backend/.env.local..."
  cat > .env.local << 'EOF'
MONGODB_URI=mongodb://localhost:27017/deva-walls
JWT_SECRET=change_this_to_random_string_in_production
PORT=4000
GOOGLE_CLIENT_SECRET=your_google_client_secret_here
API_BASE_URL=http://localhost:4000
NODE_ENV=development
EOF
  echo "✓ backend/.env.local created (update with your secrets)"
else
  echo "✓ backend/.env.local already exists"
fi

echo "Installing backend dependencies..."
pnpm install

echo "✓ Backend setup complete"
echo ""

cd ..

# Display startup instructions
echo "=================================="
echo "✓ Setup Complete!"
echo "=================================="
echo ""
echo "Next Steps:"
echo "1. Update .env.local with your Google OAuth Client ID"
echo "2. Update backend/.env.local with your MongoDB URI and JWT secret"
echo ""
echo "To start development:"
echo ""
echo "Terminal 1 - Backend:"
echo "  cd backend && pnpm run dev"
echo ""
echo "Terminal 2 - Frontend (Android):"
echo "  pnpm run dev"
echo ""
echo "Terminal 2 - Frontend (iOS):"
echo "  pnpm run dev:ios"
echo ""
echo "Terminal 2 - Frontend (Web):"
echo "  pnpm run dev:web"
echo ""
echo "📖 See SETUP_GUIDE.md for detailed instructions"
echo ""
