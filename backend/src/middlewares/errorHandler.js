import { ZodError } from 'zod';
import { AppError } from '../utils/errors.js';

export function notFoundHandler(_req, res) {
  res.status(404).json({ erro: { codigo: 'NOT_FOUND', mensagem: 'Rota não encontrada' } });
}

// eslint-disable-next-line no-unused-vars
export function errorHandler(err, _req, res, _next) {
  if (err instanceof AppError) {
    return res.status(err.status).json({ erro: { codigo: err.code, mensagem: err.message, detalhes: err.details } });
  }
  if (err instanceof ZodError) {
    return res.status(400).json({ erro: { codigo: 'BAD_REQUEST', mensagem: 'Dados inválidos' } });
  }
  if (err?.type === 'entity.parse.failed') {
    return res.status(400).json({ erro: { codigo: 'BAD_REQUEST', mensagem: 'JSON inválido' } });
  }
  console.error(err); // inclusive em teste: um 500 nunca deve passar em silêncio
  res.status(500).json({ erro: { codigo: 'INTERNAL', mensagem: 'Erro interno do servidor' } });
}
