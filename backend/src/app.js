import compression from 'compression';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import swaggerUi from 'swagger-ui-express';
import { env } from './config/env.js';
import { openapi } from './docs.js';
import { errorHandler, notFoundHandler } from './middlewares/errorHandler.js';
import { rejectNullBytes } from './middlewares/validate.js';
import { globalLimiter } from './middlewares/rateLimit.js';
import routes from './routes/index.js';
import seoRoutes from './modules/seo/seo.routes.js';

export const app = express();
app.set('trust proxy', 1);
// Swagger UI precisa de scripts/estilos inline: CSP relaxada SOMENTE em /api/docs, e desligado em produção (ENABLE_DOCS=true para ligar).
const docsEnabled = env.ENABLE_DOCS ?? env.NODE_ENV !== 'production';
if (docsEnabled) app.use('/api/docs', helmet({ contentSecurityPolicy: false }), swaggerUi.serve, swaggerUi.setup(openapi));
// A API só devolve JSON/XML/CSV: CSP restritiva e sem possibilidade de ser embutida em frames.
app.use(helmet({ contentSecurityPolicy: { directives: { defaultSrc: ["'none'"], frameAncestors: ["'none'"] } } }));
app.use(compression());
app.use(cors({ origin: env.CORS_ORIGIN, credentials: true }));
app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());
app.use(rejectNullBytes);
if (env.NODE_ENV !== 'test') app.use(morgan('tiny'));
app.use('/api', globalLimiter);
app.use(seoRoutes); // /sitemap.xml e /robots.txt na raiz
app.use('/api', routes);
app.use(notFoundHandler);
app.use(errorHandler);
