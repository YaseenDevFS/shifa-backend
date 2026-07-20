// routes/userRoutes.js
import express from 'express';
import {
  getAllUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  resetUserPassword,
  changeMyPassword,
  updateMyProfile,
  getMyProfile,
  toggleUserStatus,
  searchUsers,
  getUserStats
} from '../controllers/userController.js';
import { protect, restrictTo } from '../middleware/auth.js';

const router = express.Router();

// ══════════════════════════════════════════════════════════════════════════════
//  مسارات المستخدمين (كلها محمية وتتطلب صلاحيات مدير)
// ══════════════════════════════════════════════════════════════════════════════

// ── جميع المسارات تتطلب مصادقة ──
router.use(protect);

// ── مسارات المدير فقط ──
router.use(restrictTo('admin', 'super_admin'));

// ── إحصائيات المستخدمين ──
router.get('/stats', getUserStats);

// ── البحث عن المستخدمين ──
router.get('/search', searchUsers);

// ── CRUD الأساسي ──
router.get('/', getAllUsers);
router.get('/:id', getUserById);
router.post('/', createUser);
router.put('/:id', updateUser);
router.delete('/:id', deleteUser);

// ── إدارة كلمة المرور ──
router.patch('/:id/reset-password', resetUserPassword);

// ── تفعيل/تعطيل المستخدم ──
router.patch('/:id/toggle-status', toggleUserStatus);

export default router;