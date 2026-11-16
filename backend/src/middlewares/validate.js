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
