// server.js
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import departmentRoutes from './routes/departmentRoutes.js'
import doctorsRoutes from './routes/doctorsRoutes.js'
import appointmentRoutes from './routes/AppointmentRoutes.js'
import futuresRoutes from './routes/futuresRoutes.js'
import adminRoutes from './routes/AdminrRoutes.js'

dotenv.config();

const app = express();

// ── CORS Configuration ──────────────────────────────────────────────────────────
app.use(cors({
    origin: 'http://localhost:3000', // عنوان الـ Frontend
    credentials: true,               // السماح بإرسال Cookies
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.json({ limit: '10mb' }))

const PORT = process.env.PORT || 5000;

// ── Routes ──────────────────────────────────────────────────────────────────────
app.use('/api/departments', departmentRoutes)
app.use('/api/futures', futuresRoutes)
app.use('/api/doctors', doctorsRoutes)
app.use('/api/appointments', appointmentRoutes)
app.use('/api/admin', adminRoutes)

app.listen(PORT, () => {
    console.log(`🚀 Server is running on port: ${PORT}`)
})