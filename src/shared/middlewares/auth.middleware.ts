import { Request, Response, NextFunction } from 'express'
import { verifyToken } from '../utils/jwt'
import { prisma } from '../infra/prisma'

// 1. Extendemos la interfaz Request de Express para que TypeScript no chille
// cuando le queramos meter el 'user'
export interface AuthenticatedRequest extends Request {
  user?: {
    id: string
    alias: string
    email: string
    firstName: string
  }
}

export const authMiddleware = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    // 1. Buscamos el gafete (Token) en los headers HTTP
    const authHeader = req.headers.authorization

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'Acceso denegado. ¡No trae credenciales, mi compa!',
      })
    }

    // 2. Limpiamos la palabra 'Bearer ' y nos quedamos con el puro token
    const token = authHeader.split(' ')[1]
    const decoded = verifyToken(token)

    // 3. Verificamos en la base de datos que el compa no haya sido eliminado
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: {
        id: true,
        alias: true,
        email: true,
        firstName: true,
      },
    })

    if (!user) {
      return res.status(401).json({
        error: 'Usuario no encontrado. Este compa ya no está en el batallón.',
      })
    }

    // 4. Si todo está firme, le pegamos el usuario a la Request y lo dejamos pasar
    req.user = user
    next()
  } catch (error) {
    return res.status(401).json({
      error: 'Token inválido o expirado. ¡Ese acceso ya no sirve!',
    })
  }
}
