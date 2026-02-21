import { prisma } from '../../shared/infra/prisma'
import { hashPassword, comparePassword } from '../../shared/utils/password'
import { generateToken } from '../../shared/utils/jwt'
import { RegisterDto, LoginDto } from './auth.dto'

export class AuthService {
  async register(data: RegisterDto) {
    // 1. Verificar si existe usuario o email
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [{ email: data.email }, { username: data.username }],
      },
    })

    if (existingUser) {
      throw new Error('El usuario o email ya existe')
    }

    // 2. Hash password
    const hashedPassword = await hashPassword(data.password)

    // 3. Crear usuario
    const newUser = await prisma.user.create({
      data: {
        email: data.email,
        username: data.username,
        password: hashedPassword,
        fullName: data.fullName,
      },
    })

    // 4. Generar token
    const token = generateToken(newUser.id)

    return {
      user: {
        id: newUser.id,
        email: newUser.email,
        username: newUser.username,
      },
      token,
    }
  }

  async login(data: LoginDto) {
    // 1. Buscar usuario
    const user = await prisma.user.findUnique({
      where: { email: data.email },
    })

    if (!user) throw new Error('Credenciales inválidas')

    // 2. Comparar password
    const isValid = await comparePassword(data.password, user.password)

    if (!isValid) throw new Error('Credenciales inválidas')

    // 3. Generar token
    const token = generateToken(user.id)

    return {
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
      },
      token,
    }
  }
}
