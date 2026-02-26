import { prisma } from '../../shared/infra/prisma'
import { hashPassword, comparePassword } from '../../shared/utils/password'
import { generateToken } from '../../shared/utils/jwt'

// Interfaz actualizada con firstName y lastName
interface RegisterInput {
  email: string
  password: string
  alias: string
  firstName: string
  lastName: string
  avatarUrl: string | null
}

interface LoginInput {
  email: string
  password: string
}

export class AuthService {
  async register(data: RegisterInput) {
    // 1. Verificar si existe usuario o email (Usando alias)
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [{ email: data.email }, { alias: data.alias }],
      },
    })

    if (existingUser) {
      if (existingUser.email === data.email) throw new Error('El email ya está registrado')
      if (existingUser.alias === data.alias) throw new Error('El alias ya está en uso')
    }

    const hashedPassword = await hashPassword(data.password)

    // 2. Crear usuario con la foto y los nuevos campos
    const newUser = await prisma.user.create({
      data: {
        email: data.email,
        alias: data.alias,
        firstName: data.firstName,
        lastName: data.lastName,
        password: hashedPassword,
        avatarUrl: data.avatarUrl,
      },
    })

    const token = generateToken(newUser.id)

    return {
      user: {
        id: newUser.id,
        email: newUser.email,
        alias: newUser.alias,
        firstName: newUser.firstName,
        lastName: newUser.lastName,
        avatarUrl: newUser.avatarUrl,
      },
      token,
    }
  }

  async login(data: LoginInput) {
    const user = await prisma.user.findUnique({
      where: { email: data.email },
    })

    if (!user) throw new Error('Credenciales inválidas')

    const isValid = await comparePassword(data.password, user.password)
    if (!isValid) throw new Error('Credenciales inválidas')

    const token = generateToken(user.id)

    return {
      user: {
        id: user.id,
        email: user.email,
        alias: user.alias,
        firstName: user.firstName,
        lastName: user.lastName,
        avatarUrl: user.avatarUrl,
      },
      token,
    }
  }

  // 3. Verificar si el alias/email están libres
  async checkAvailability(email?: string, alias?: string) {
    const conditions = []
    if (email) conditions.push({ email })
    if (alias) conditions.push({ alias })

    const user = await prisma.user.findFirst({
      where: { OR: conditions },
    })

    // Retorna true si está libre (no existe nadie con ese dato)
    return user === null
  }
}
