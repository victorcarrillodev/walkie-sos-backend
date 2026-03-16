import { PrismaClient } from '@prisma/client'
import { Pool } from 'pg'
import { PrismaPg } from '@prisma/adapter-pg'
import { env } from '../../config/env'

// // 1. Cargar variables de entorno MANUALMENTE para asegurar que existan
// dotenv.config()

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }

// 2. Función para inicializar el cliente (Singleton)
const prismaClientSingleton = () => {
  // Configuración del Pool de Postgres
  const connectionString = env.DATABASE_URL

  const pool = new Pool({
    connectionString,
    max: 10, // Máximo de conexiones en el pool (ajustar según tu VPS)
    idleTimeoutMillis: 30000,
  })

  // Crear el adaptador
  const adapter = new PrismaPg(pool as any)

  // Inicializar Prisma con el adaptador
  return new PrismaClient({
    adapter,
    log: ['query', 'info', 'warn', 'error'],
  })
}

// 3. Exportar la instancia
export const prisma = globalForPrisma.prisma ?? prismaClientSingleton()

if (env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
