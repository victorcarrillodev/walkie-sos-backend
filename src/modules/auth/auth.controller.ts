import { Request, Response } from 'express'
import { AuthService } from './auth.service'
import { z } from 'zod'

const authService = new AuthService()

// Esquemas de validación con Zod
const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  username: z.string().min(3),
  fullName: z.string().optional(),
})

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
})

export const register = async (req: Request, res: Response) => {
  try {
    const data = registerSchema.parse(req.body) // Valida inputs
    const result = await authService.register(data)
    res.status(201).json(result)
  } catch (error: any) {
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
