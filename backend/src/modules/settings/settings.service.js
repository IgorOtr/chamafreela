import { prisma } from '../../database/prisma.js';
import * as audit from '../audit/audit.service.js';

const FORMALIZA_KEY = 'formaliza';
const FORMALIZA_DEFAULT = { enabled: false, bookingUrl: '' };

export async function getFormaliza() {
  const row = await prisma.siteSetting.findUnique({ where: { key: FORMALIZA_KEY } });
  return { ...FORMALIZA_DEFAULT, ...(row?.value ?? {}), updatedAt: row?.updatedAt ?? null };
}

// Público: o link só é divulgado quando o agendamento está ligado e o link existe.
export async function getFormalizaPublic() {
  const s = await getFormaliza();
  const ready = s.enabled && Boolean(s.bookingUrl);
  return { ready, bookingUrl: ready ? s.bookingUrl : '' };
}

export async function updateFormaliza(actor, data, ip) {
  const before = await getFormaliza();
  const value = { enabled: data.enabled, bookingUrl: data.bookingUrl };
  await prisma.siteSetting.upsert({
    where: { key: FORMALIZA_KEY },
    update: { value, updatedById: actor.id },
    create: { key: FORMALIZA_KEY, value, updatedById: actor.id },
  });
  await audit.record({
    actorId: actor.id, action: 'SETTINGS_UPDATE', entity: 'SiteSetting', entityId: FORMALIZA_KEY, ip,
    changes: { enabled: { de: before.enabled, para: value.enabled }, bookingUrl: { de: before.bookingUrl, para: value.bookingUrl } },
  });
  return getFormaliza();
}
