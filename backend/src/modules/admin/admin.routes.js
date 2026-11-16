import { Router } from 'express';
import { authenticate, requirePermission } from '../../middlewares/auth.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import * as service from './admin.service.js';
import { z } from 'zod';
import { validate } from '../../middlewares/validate.js';
import * as reports from '../reports/reports.service.js';

const router = Router();
router.get('/dashboard', authenticate, requirePermission('admin:dashboard'),
  asyncHandler(async (_req, res) => res.json(await service.dashboard())));

// Relatórios avançados (administração)
const monthsQuery = z.object({ months: z.coerce.number().int().min(1).max(24).default(12) });
const exportQuery = monthsQuery.extend({ dataset: z.enum(['signups', 'modules', 'subscriptions']) });
const eventsQuery = z.object({ limit: z.coerce.number().int().min(1).max(200).default(50) });
router.get('/reports/overview', authenticate, requirePermission('reports:read'), validate(monthsQuery, 'query'),
  asyncHandler(async (req, res) => res.json(await reports.overview(req.query))));
router.get('/reports/export', authenticate, requirePermission('reports:read'), validate(exportQuery, 'query'), asyncHandler(async (req, res) => {
  const { filename, rows } = await reports.exportDataset(req.query.dataset, req.query.months);
  res.set('Content-Disposition', `attachment; filename="${filename}"`).type('text/csv; charset=utf-8').send(reports.toCsv(rows));
}));
router.get('/reports/events', authenticate, requirePermission('reports:read'), validate(eventsQuery, 'query'),
  asyncHandler(async (req, res) => res.json(await reports.events(req.query))));

export default router;
