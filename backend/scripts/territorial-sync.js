// Sincroniza indicadores do IBGE: node --env-file=.env scripts/territorial-sync.js [codigo ...]
import { prisma } from '../src/database/prisma.js';
import { SUL_FLUMINENSE, syncMunicipality } from '../src/modules/territorial/territorial.service.js';

const codes = process.argv.slice(2).length ? process.argv.slice(2) : SUL_FLUMINENSE;
for (const code of codes) {
  try {
    const r = await syncMunicipality(code);
    console.log(`${r.code} ${r.name}: ok=[${r.ok.join(', ')}]${r.failed.length ? ' FALHAS=' + JSON.stringify(r.failed) : ''}`);
  } catch (e) { console.error(`${code}: ${e.message}`); }
}
await prisma.$disconnect();
