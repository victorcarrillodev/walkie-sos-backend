import { Socket } from 'socket.io'
import { verifyToken } from '../utils/jwt'
import { prisma } from '../infra/prisma'

// Extendemos la interfaz de Socket para incluir al usuario
export interface AuthenticatedSocket extends Socket {
  user?: {
    id: string
    username: string
    email: string
  }
}

export const socketAuthMiddleware = async (socket: Socket, next: (err?: any) => void) => {
  try {
    // 1. Buscamos el token en los headers o en auth del handshake
    const token = socket.handshake.auth.token || socket.handshake.headers.authorization

    if (!token) {
      return next(new Error('Autenticación requerida'))
    }

    // 2. Verificamos el token (JWT)
    // Limpiamos "Bearer " si viene incluido
    const cleanToken = token.replace('Bearer ', '')
    const decoded = verifyToken(cleanToken)

    // 3. Verificamos que el usuario exista en DB (Opcional pero recomendado en VPS)
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: { id: true, username: true, email: true },
    })

    if (!user) {
      return next(new Error('Usuario no encontrado'))
    }

    // 4. Adjuntamos el usuario al objeto socket para usarlo después
    ;(socket as AuthenticatedSocket).user = user

    next()
  } catch (error) {
    next(new Error('Token inválido o expirado'))
  }
}
