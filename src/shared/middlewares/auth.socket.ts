import { Socket } from 'socket.io'
import { verifyToken } from '../utils/jwt'
import { prisma } from '../infra/prisma'

// 1. Extendemos la interfaz con los datos de un hombre de alto valor
export interface AuthenticatedSocket extends Socket {
  user?: {
    id: string
    alias: string // <-- ¡Puro alias, mi compa, borre ese username!
    email: string
    firstName: string // <-- Lo traemos para que el sistema sepa su nombre
  }
}

export const socketAuthMiddleware = async (socket: Socket, next: (err?: any) => void) => {
  try {
    // Buscamos el token
    const token = socket.handshake.auth.token || socket.handshake.headers.authorization

    if (!token) {
      return next(new Error('Autenticación requerida. ¡Identifíquese, mi compa!'))
    }

    // Limpiamos y verificamos
    const cleanToken = token.replace('Bearer ', '')
    const decoded = verifyToken(cleanToken)

    // 2. VITAL: Actualizamos el SELECT de Prisma
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: {
        id: true,
        alias: true, // <-- CAMBIO CLAVE AQUÍ
        email: true,
        firstName: true, // <-- CAMBIO CLAVE AQUÍ
      },
    })

    if (!user) {
      return next(new Error('Usuario no encontrado en la base de datos.'))
    }

    // 3. Adjuntamos el usuario validado
    ;(socket as AuthenticatedSocket).user = user

    next()
  } catch (error) {
    next(new Error('Token inválido o expirado. ¡Ese acceso ya no sirve!'))
  }
}
