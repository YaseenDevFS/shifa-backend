import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import departmentRoutes from './routes/departmentRoutes.js';
import doctorsRoutes from './routes/doctorsRoutes.js';
import appointmentRoutes from './routes/AppointmentRoutes.js';
import futuresRoutes from './routes/futuresRoutes.js';
import adminRoutes from './routes/AdminrRoutes.js';

dotenv.config();

const app = express();

// CORS configuration
const allowedOrigins = [
  process.env.CLIENT_URL || 'http://localhost:3000',
  'https://shifa-backend-lemon.vercel.app',
  'https://shifa-backend-lemon.vercel.app/',
  // Add your frontend URL if different
  'https://your-frontend-domain.vercel.app', // Replace with your frontend URL
  'http://localhost:3000',
  'http://localhost:5173', // If using Vite
];

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      console.log('Blocked origin:', origin);
      callback(null, true); // Allow all in development, remove this in production
      // callback(new Error('Not allowed by CORS')); // Uncomment in production
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.json({ limit: '10mb' }));

app.get('/', (req, res) => {
  res.json({ status: 'ok', service: 'shifa-backend' });
});

app.use('/api/departments', departmentRoutes);
app.use('/api/futures', futuresRoutes);
app.use('/api/doctors', doctorsRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/admin', adminRoutes);

const PORT = process.env.PORT || 5000;

if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => {
    console.log(`Server is running on port: ${PORT}`);
  });
}

export default app;