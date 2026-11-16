// Função serverless da Vercel: expõe o app Express (backend/src/app.js) para /api/*, /sitemap.xml e /robots.txt.
// As rotas são resolvidas pelo Express; os redirecionamentos estão em vercel.json.
import { app } from '../backend/src/app.js';

export default app;
