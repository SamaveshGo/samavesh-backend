import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import connectDB from './config/db';
import authRoutes from './routes/auth';
import routeRoutes from './routes/routes';
import modelRoutes from './routes/model';
import { protect, AuthRequest } from './middlewares/authMiddleware';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5001;

// Connect Database
connectDB();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/routes', routeRoutes);
app.use('/api/model', modelRoutes);

// Health Check & Auth Check endpoint
app.get('/', (req, res) => {
  res.status(200).json({ status: 'ok', message: 'Samavesh Backend is running' });
});

app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok', message: 'Samavesh Backend is running' });
});

app.get('/api/auth/me', protect, (req: AuthRequest, res) => {
  res.status(200).json({ success: true, user: req.user });
});

// Start Server
app.listen(Number(PORT), '0.0.0.0', () => {
  console.log(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT} (0.0.0.0)`);
});
