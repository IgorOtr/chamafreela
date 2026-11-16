export class AppError extends Error {
  constructor(status, message, code, details) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}
export const badRequest = (m, d) => new AppError(400, m, 'BAD_REQUEST', d);
export const unauthorized = (m = 'Não autenticado') => new AppError(401, m, 'UNAUTHORIZED');
export const forbidden = (m = 'Sem permissão para esta operação') => new AppError(403, m, 'FORBIDDEN');
export const notFound = (m = 'Recurso não encontrado') => new AppError(404, m, 'NOT_FOUND');
export const conflict = (m) => new AppError(409, m, 'CONFLICT');
