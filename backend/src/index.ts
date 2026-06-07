import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import 'express-async-errors';
import path from 'path';
import { fileURLToPath } from 'url';
import { connectDB } from './config/db.js';
import authRoutes from './routes/auth.js';
import wallpapersRoutes from './routes/wallpapers.js';


const app = express();
app.set('trust proxy', 1); // Trust Render/Cloudflare proxies to get the real client IP

const PORT = process.env.PORT || 4000;
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' }
}));
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// Rate limiting (restricted to API calls, excluded from static assets)
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 2000, // 2000 requests per 15 minutes per IP
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api', apiLimiter);

// Static file serving for wallpapers
app.use('/wallpapers', express.static(path.join(__dirname, '../../public/wallpapers')));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/wallpapers', wallpapersRoutes);

// Health check & welcome routes
app.get('/', (req, res) => {
  res.json({
    name: 'Deva Walls API',
    version: '1.0.0',
    status: 'online',
    documentation: 'https://github.com/krrish-singhal/devawalls'
  });
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Error handling middleware
app.use((err: any, req: any, res: any, next: any) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({ error: err.message || 'Internal server error' });
});

// Start server
async function start() {
  try {
    // Connect to MongoDB (optional - can work without DB)
    try {
      await connectDB();
    } catch (dbError) {
      console.warn('MongoDB connection failed, continuing without database:', dbError);
    }

    app.listen(Number(PORT), '0.0.0.0', () => {
      console.log(`Server running on port ${PORT}`);
      console.log(`Static files served from /wallpapers`);
      console.log(`API endpoints:`);
      console.log(`   - GET  /health`);
      console.log(`   - POST /api/auth/google`);
      console.log(`   - PATCH /api/user/profile`);
      console.log(`   - GET  /api/wallpapers/featured`);
      console.log(`   - GET  /api/wallpapers/:category`);
      console.log(`   - GET  /api/wallpapers`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

start();
