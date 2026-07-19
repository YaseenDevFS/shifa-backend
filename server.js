import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import departmentRoutes from './routes/departmentRoutes.js';
import doctorsRoutes from './routes/doctorsRoutes.js';
import appointmentRoutes from './routes/AppointmentRoutes.js';
import futuresRoutes from './routes/futuresRoutes.js';
import adminRoutes from './routes/AdminrRoutes.js';
import authRoutes from './routes/authRoutes.js'; // جديد

dotenv.config();

const app = express();

// CORS configuration
const allowedOrigins = [
  process.env.CLIENT_URL || 'http://localhost:3000',
  'https://shifa-backend-lemon.vercel.app',
  'http://localhost:3000',
  'http://localhost:5173',
];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) !== -1 || process.env.NODE_ENV !== 'production') {
      callback(null, true);
    } else {
      console.log('Blocked origin:', origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.json({ limit: '10mb' }));

// Routes
app.get('/', (req, res) => {
  res.json({ 
    status: 'ok', 
    service: 'shifa-backend',
    message: 'Welcome to Shifa API',
    endpoints: {
      auth: '/api/auth',
      departments: '/api/departments',
      doctors: '/api/doctors',
      appointments: '/api/appointments',
      futures: '/api/futures',
      admin: '/api/admin'
    }
  });
});

// API Routes
app.use('/api/auth', authRoutes); // جديد - مسارات المصادقة
app.use('/api/departments', departmentRoutes);
app.use('/api/futures', futuresRoutes);
app.use('/api/doctors', doctorsRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/admin', adminRoutes);

const PORT = process.env.PORT || 5000;

if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => {
    console.log(`🚀 Server is running on port: ${PORT}`);
    console.log(`📝 Auth endpoints available at: http://localhost:${PORT}/api/auth`);
  });
}

export default app;