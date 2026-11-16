import { Router } from 'express';
import { authenticate, requireRole } from '../../middlewares/auth.js';
import { validate } from '../../middlewares/validate.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { notFound } from '../../utils/errors.js';
import * as service from './studio.service.js';
import { assetListQuery, assetPatchSchema, assetSchema, brandSchema, calendarSchema, generateSchema, logoPreviewSchema } from './studio.validators.js';

const router = Router();
// Studio: apoio de marketing para autônomos (profissionais) e pequenas empresas.
router.use(authenticate, requireRole('PROFISSIONAL', 'EMPRESA'));

router.get('/options', (_req, res) => res.json(service.options()));
router.post('/generate', validate(generateSchema), (req, res) => res.json(service.generate(req.body)));
router.post('/logo/preview', validate(logoPreviewSchema), (req, res) => res.json(service.logoPreview(req.body)));
router.post('/calendar/generate', validate(calendarSchema), (req, res) => res.json(service.calendar(req.body)));

router.get('/brand', asyncHandler(async (req, res) => {
  const b = await service.getBrand(req.user.id);
  if (!b) throw notFound('Kit de marca ainda não criado');
  res.json(b);
}));
router.put('/brand', validate(brandSchema), asyncHandler(async (req, res) => res.json(await service.saveBrand(req.user, req.body))));

router.get('/assets', validate(assetListQuery, 'query'), asyncHandler(async (req, res) => res.json(await service.listAssets(req.user.id, req.query.type))));
router.post('/assets', validate(assetSchema), asyncHandler(async (req, res) => res.status(201).json(await service.createAsset(req.user, req.body))));
router.patch('/assets/:id', validate(assetPatchSchema), asyncHandler(async (req, res) => res.json(await service.updateAsset(req.user, req.params.id, req.body))));
router.delete('/assets/:id', asyncHandler(async (req, res) => { await service.deleteAsset(req.user, req.params.id); res.status(204).end(); }));

export default router;
