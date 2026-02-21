import { prisma } from '../../shared/infra/prisma'

export class ChannelService {
  // Crear un nuevo canal
  async createChannel(
    userId: string,
    data: { name: string; description?: string; isPrivate?: boolean; accessKey?: string },
  ) {
    return await prisma.channel.create({
      data: {
        name: data.name,
        description: data.description,
        isPrivate: data.isPrivate || false,
        accessKey: data.accessKey, // En producción, esto debería hashearse también
        ownerId: userId,
        members: {
          create: {
            userId: userId,
            role: 'ADMIN',
          },
        },
      },
    })
  }

  // Listar canales donde soy miembro
  async getUserChannels(userId: string) {
    return await prisma.channel.findMany({
      where: {
        members: {
          some: { userId: userId },
        },
      },
      include: {
        _count: { select: { members: true } }, // Contar cuántos usuarios hay
      },
    })
  }

  // Buscar canales públicos (para unirse)
  async getPublicChannels() {
    return await prisma.channel.findMany({
      where: { isPrivate: false },
      take: 20, // Paginación simple
    })
  }
}
