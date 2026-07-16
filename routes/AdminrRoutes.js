import { Router } from 'express';
import { login, getMe, changePassword } from '../controllers/adminAuthController.js';
import { getDashboardStats } from '../controllers/adminDashboardController.js';
import {
  getAllAppointments,
  getAppointmentById,
  updateAppointmentStatus,
  updateAppointment,
  deleteAppointment,
} from '../controllers/adminAppointmentsController.js';
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

// ── Auth ──────────────────────────────────────────────────────────────────────
router.post('/auth/login', login);
router.get('/auth/me', protect, getMe);
router.post('/auth/change-password', protect, changePassword);

// ── Dashboard ─────────────────────────────────────────────────────────────────
router.get('/dashboard/stats', protect, getDashboardStats);

// ── Settings ─────────────────────────────────────────────────────────────────
router.get('/settings/logo', getSiteLogo);
router.put('/settings/logo', protect, updateSiteLogo);

// ── Appointments ──────────────────────────────────────────────────────────────
router.get('/appointments', protect, getAllAppointments);
router.get('/appointments/:id', protect, getAppointmentById);
router.patch('/appointments/:id/status', protect, updateAppointmentStatus);
router.put('/appointments/:id', protect, updateAppointment);
router.delete('/appointments/:id', protect, restrictTo('super_admin'), deleteAppointment);

// ── Doctors ───────────────────────────────────────────────────────────────────
router.get('/doctors', protect, getAllDoctors);
router.get('/doctors/:id', protect, getDoctorById);
router.post('/doctors', protect, createDoctor);
router.put('/doctors/:id', protect, updateDoctor);
router.delete('/doctors/:id', protect, restrictTo('super_admin'), deleteDoctor);

// ── Departments ───────────────────────────────────────────────────────────────
router.get('/departments', protect, getAllDepartments);
router.get('/departments/:id', protect, getDepartmentById);
router.post('/departments', protect, createDepartment);
router.put('/departments/:id', protect, updateDepartment);
router.delete('/departments/:id', protect, restrictTo('super_admin'), deleteDepartment);

export default router;