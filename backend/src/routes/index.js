import { Router } from 'express';
import adminRoutes from '../modules/admin/admin.routes.js';
import auditRoutes from '../modules/audit/audit.routes.js';
import authRoutes from '../modules/auth/auth.routes.js';
import categoriesRoutes from '../modules/categories/categories.routes.js';
import usersRoutes from '../modules/users/users.routes.js';

const router = Router();
router.get('/health', (_req, res) => res.json({ status: 'ok' }));
router.use('/auth', authRoutes);
router.use('/users', usersRoutes);
router.use('/categories', categoriesRoutes);
router.use('/admin', adminRoutes);
router.use('/audit', auditRoutes);
export default router;
