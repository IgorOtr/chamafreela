import { z } from 'zod';
import { PUBLIC_REGISTRATION_ROLES } from '../../config/permissions.js';

export const registerSchema = z.object({
  name: z.string().trim().min(2, 'Informe o nome').max(120),
  email: z.string().trim().toLowerCase().email('E-mail inválido'),
  password: z
    .string()
    .min(8, 'A senha deve ter ao menos 8 caracteres')
    .regex(/[A-Za-z]/, 'A senha deve conter letras')
    .regex(/\d/, 'A senha deve conter números'),
  role: z.enum(PUBLIC_REGISTRATION_ROLES),
  consent: z.literal(true, { message: 'É necessário aceitar a Política de Privacidade' }),
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(1),
});
