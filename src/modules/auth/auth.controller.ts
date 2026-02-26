import { Request, Response } from 'express'
import { AuthService } from './auth.service'
import { z } from 'zod'

const authService = new AuthService()

// Esquemas de validación actualizados
const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  alias: z.string().min(3),
  firstName: z.string().min(2, 'El nombre es muy corto'),
  lastName: z.string().min(2, 'El apellido es muy corto'),
})

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
})

const checkSchema = z
  .object({
    email: z.string().email().optional(),
    alias: z.string().min(3).optional(),
  })
  .refine((data) => data.email || data.alias, {
    message: 'Debes enviar un email o un alias para verificar',
  })

export const register = async (req: Request, res: Response) => {
  try {
    const data = registerSchema.parse(req.body)

    let avatarUrl = null
    if (req.file) {
      // Reemplaza localhost con la IP de tu PC para que Flutter pueda verla en modo local
      avatarUrl = `http://localhost:3000/uploads/avatars/${req.file.filename}`
    }

    const result = await authService.register({ ...data, avatarUrl })

    res.status(201).json(result)
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.issues.map((e) => e.message).join(', ') })
    }
    res.status(400).json({ error: error.message || 'Error al registrar' })
  }
}

export const login = async (req: Request, res: Response) => {
  try {
    const data = loginSchema.parse(req.body)
    const result = await authService.login(data)
    res.status(200).json(result)
  } catch (error: any) {
    res.status(401).json({ error: error.message || 'Error de autenticación' })
  }
}

export const checkAvailability = async (req: Request, res: Response) => {
  try {
    const data = checkSchema.parse(req.body)
    const isAvailable = await authService.checkAvailability(data.email, data.alias)
    res.status(200).json({ available: isAvailable })
  } catch (error: any) {
    res.status(400).json({ error: error.message })
  }
}
