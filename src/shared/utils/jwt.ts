import jwt from 'jsonwebtoken'

const SECRET = process.env.JWT_SECRET || 'secret_dev_key'

// NUEVO: Agregamos el alias para guardarlo dentro del token
export const generateToken = (userId: string, alias: string) => {
  // El token expira en 7 días (ajustar según necesidad)
  return jwt.sign({ id: userId, alias: alias }, SECRET, { expiresIn: '7d' })
}

export const verifyToken = (token: string) => {
  return jwt.verify(token, SECRET) as { id: string; alias: string }
}
