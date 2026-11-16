import { prisma } from '../../database/prisma.js';

// Registro de falhas operacionais relevantes (visíveis à administração). Nunca lança: observabilidade não pode derrubar a operação.
export async function recordEvent({ level = 'error', source, message, path, method }) {
  try {
    await prisma.systemEvent.create({ data: { level, source, message: String(message).slice(0, 500), path: path?.slice(0, 200), method } });
  } catch (e) {
    console.error('[events] não foi possível registrar o evento:', e.message);
  }
}
