// routes/authRoutes.js
import express from 'express';
import {
  login,
  register,
  getMe,
  updateProfile,
  changePassword,
  logout,
  getAllUsers
} from '../controllers/authController.js';
import { protect, restrictTo } from '../middlewares/auth.js';

const router = express.Router();

// ── مسارات عامة ──
router.post('/login', login);
router.post('/register', register);
router.post('/logout', logout);

// ── مسارات محمية ──
router.use(protect);

router.get('/me', getMe);
router.put('/profile', updateProfile);
router.post('/change-password', changePassword);

// ── مسارات المدير فقط ──
router.get('/users', restrictTo('admin', 'super_admin'), getAllUsers);

export default router;