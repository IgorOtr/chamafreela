import { badRequest } from '../utils/errors.js';

export const validate = (schema, source = 'body') => (req, _res, next) => {
  const result = schema.safeParse(req[source]);
  if (!result.success) {
    const details = result.error.issues.map((i) => ({ campo: i.path.join('.'), mensagem: i.message }));
    return next(badRequest('Dados inválidos', details));
  }
  req[source] = result.data;
  next();
};

// PostgreSQL não aceita o caractere NUL (\u0000) em texto: sem este filtro, ele causaria erro 500.
// Rejeita NUL em qualquer valor de query/body (profundidade limitada) com 400.
function hasNull(value, depth = 0) {
  if (typeof value === 'string') return value.includes('\u0000');
  if (depth > 6 || value === null || typeof value !== 'object') return false;
  return Object.entries(value).some(([k, v]) => k.includes('\u0000') || hasNull(v, depth + 1));
}
export function rejectNullBytes(req, _res, next) {
  if (hasNull(req.query) || hasNull(req.body)) return next(badRequest('Caracteres inválidos na requisição'));
  next();
}
