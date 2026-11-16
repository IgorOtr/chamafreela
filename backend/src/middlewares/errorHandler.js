import { ZodError } from 'zod';
import { AppError } from '../utils/errors.js';
import { recordEvent } from '../modules/reports/events.js';

export function notFoundHandler(_req, res) {
  res.status(404).json({ erro: { codigo: 'NOT_FOUND', mensagem: 'Rota não encontrada' } });
}

// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, _next) {
  if (err instanceof AppError) {
    return res.status(err.status).json({ erro: { codigo: err.code, mensagem: err.message, detalhes: err.details } });
  }
  if (err instanceof ZodError) {
    return res.status(400).json({ erro: { codigo: 'BAD_REQUEST', mensagem: 'Dados inválidos' } });
  }
  if (err?.type === 'entity.too.large') {
    return res.status(413).json({ erro: { codigo: 'PAYLOAD_TOO_LARGE', mensagem: 'Corpo da requisição grande demais' } });
  }
  if (err?.type === 'entity.parse.failed') {
    return res.status(400).json({ erro: { codigo: 'BAD_REQUEST', mensagem: 'JSON inválido' } });
  }
  console.error(err); // inclusive em teste: um 500 nunca deve passar em silêncio
  recordEvent({ level: 'error', source: 'api', message: err?.message ?? 'Erro desconhecido', path: req.path, method: req.method });
  res.status(500).json({ erro: { codigo: 'INTERNAL', mensagem: 'Erro interno do servidor' } });
}
