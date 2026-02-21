import dotenv from 'dotenv'
import { z } from 'zod'

// Cargar variables del archivo .env
dotenv.config()

// Definimos el esquema de validación
const envSchema = z.object({
  // Servidor
  PORT: z.string().default('3000').transform(Number), // Lo convierte a número
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),

  // Base de Datos
  DATABASE_URL: z.string().url({ message: 'DATABASE_URL debe ser una URL válida' }),

  // Seguridad
  JWT_SECRET: z.string().min(10, { message: 'JWT_SECRET debe tener al menos 10 caracteres' }),
  CORS_ORIGIN: z.string().default('*'),
})

// Validamos process.env contra el esquema
const _env = envSchema.safeParse(process.env)

if (!_env.success) {
  console.error('❌ Variables de entorno inválidas:', _env.error.format())
  process.exit(1) // Matamos el proceso si la configuración está mal
}

export const env = _env.data
