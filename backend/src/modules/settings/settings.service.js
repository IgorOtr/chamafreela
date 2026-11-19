import { prisma } from '../../database/prisma.js';
import * as audit from '../audit/audit.service.js';

const FORMALIZA_KEY = 'formaliza';

export const FORMALIZA_DEFAULT_MESSAGE = [
  'Olá! Vim pelo CHAMALÁFREE e quero agendar a consultoria do CHAMALÁ Formaliza para abrir meu MEI.',
  '',
  'Meu nome:',
  'O que pretendo fazer ou vender:',
  'Melhores dias e horários para a conversa:',
].join('\n');

const FORMALIZA_DEFAULT = { enabled: true, whatsapp: '5524999468823', message: FORMALIZA_DEFAULT_MESSAGE };

export async function getFormaliza() {
  const row = await prisma.siteSetting.findUnique({ where: { key: FORMALIZA_KEY } });
  const v = row?.value ?? {};
  return {
    enabled: typeof v.enabled === 'boolean' ? v.enabled : FORMALIZA_DEFAULT.enabled,
    whatsapp: v.whatsapp ?? FORMALIZA_DEFAULT.whatsapp,
    message: v.message ?? FORMALIZA_DEFAULT.message,
    updatedAt: row?.updatedAt ?? null,
  };
}

export const whatsappUrl = (whatsapp, message) => `https://wa.me/${whatsapp}?text=${encodeURIComponent(message)}`;

// Público: só divulga o link do WhatsApp quando o atendimento está ligado e há número.
export async function getFormalizaPublic() {
  const s = await getFormaliza();
  const ready = s.enabled && Boolean(s.whatsapp);
  return { ready, url: ready ? whatsappUrl(s.whatsapp, s.message) : '' };
}

export async function updateFormaliza(actor, data, ip) {
  const before = await getFormaliza();
  const value = { enabled: data.enabled, whatsapp: data.whatsapp, message: data.message };
  await prisma.siteSetting.upsert({
    where: { key: FORMALIZA_KEY },
    update: { value, updatedById: actor.id },
    create: { key: FORMALIZA_KEY, value, updatedById: actor.id },
  });
  await audit.record({
    actorId: actor.id, action: 'SETTINGS_UPDATE', entity: 'SiteSetting', entityId: FORMALIZA_KEY, ip,
    changes: Object.fromEntries(['enabled', 'whatsapp', 'message'].map((k) => [k, { de: before[k], para: value[k] }])),
  });
  return getFormaliza();
}
