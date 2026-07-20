import { Router } from 'express';
import { login, getMe, changePassword } from '../controllers/AdminAuthController.js';
import { getDashboardStats } from '../controllers/AdminDashboardController.js';
import {
  getAllAppointments,
  getAppointmentById,
  updateAppointmentStatus,
  updateAppointment,
  deleteAppointment,
} from '../controllers/AdminAppointmentsController.js';
import {
  getAllDoctors,
  getDoctorById,
  createDoctor,
  updateDoctor,
  deleteDoctor,
} from '../controllers/adminDoctorsController.js';
import {
  getAllDepartments,
  getDepartmentById,
  createDepartment,
  updateDepartment,
  deleteDepartment,
} from '../controllers/adminDepartmentsController.js';
import { protect, restrictTo } from '../middlewares/authMiddleware.js';
import { getSiteLogo, updateSiteLogo } from '../controllers/adminSettingsController.js';

const router = Router();

// ══════════════════════════════════════════════════════════════════════════════
//  PUBLIC ROUTES (No authentication required)
// ══════════════════════════════════════════════════════════════════════════════
router.post('/auth/login', login);

// ── Settings (public for logo) ──
router.get('/settings/logo', getSiteLogo);

// ══════════════════════════════════════════════════════════════════════════════
//  PROTECTED ROUTES (Authentication required)
// ══════════════════════════════════════════════════════════════════════════════
router.use(protect);

// ── Auth ──
router.get('/auth/me', getMe);
router.post('/auth/change-password', changePassword);

// ── Dashboard ──
router.get('/dashboard/stats', getDashboardStats);

// ── Settings ──
router.put('/settings/logo', updateSiteLogo);

// ── Appointments ──
router.get('/appointments', getAllAppointments);
router.get('/appointments/:id', getAppointmentById);
router.patch('/appointments/:id/status', updateAppointmentStatus);
router.put('/appointments/:id', updateAppointment);
router.delete('/appointments/:id', restrictTo('super_admin'), deleteAppointment);

// ── Doctors ──
router.get('/doctors', getAllDoctors);
router.get('/doctors/:id', getDoctorById);
router.post('/doctors', createDoctor);
router.put('/doctors/:id', updateDoctor);
router.delete('/doctors/:id', restrictTo('super_admin'), deleteDoctor);

// ── Departments ──
router.get('/departments', getAllDepartments);
router.get('/departments/:id', getDepartmentById);
router.post('/departments', createDepartment);
router.put('/departments/:id', updateDepartment);
router.delete('/departments/:id', restrictTo('super_admin'), deleteDepartment);

export default router;