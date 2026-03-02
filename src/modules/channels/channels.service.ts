import { prisma } from '../../shared/infra/prisma'
import { MemberRole } from '@prisma/client'

export class ChannelService {
  // 1. Crear un nuevo canal
  async createChannel(
    userId: string,
    data: { name: string; description?: string; isPrivate?: boolean; accessKey?: string },
  ) {
    return await prisma.channel.create({
      data: {
        name: data.name,
        description: data.description,
        isPrivate: data.isPrivate || false,
        isGroup: true, // Asumimos que es grupo por defecto
        accessKey: data.accessKey,
        ownerId: userId,
        members: {
          create: {
            userId: userId,
            role: MemberRole.ADMIN, // El creador es el alfa
          },
        },
      },
    })
  }

  // 2. Listar canales donde soy miembro
  async getUserChannels(userId: string) {
    return await prisma.channel.findMany({
      where: {
        members: { some: { userId: userId } },
      },
      include: {
        _count: { select: { members: true } },
      },
      orderBy: { updatedAt: 'desc' },
    })
  }

  // 3. Buscar canales públicos (para unirse)
  async getPublicChannels() {
    return await prisma.channel.findMany({
      where: { isPrivate: false },
      take: 20,
    })
  }

  // 4. Agregar compa al canal
  async addMemberToGroup(channelId: string, targetUserId: string, requesterId: string) {
    const channel = await prisma.channel.findUnique({
      where: { id: channelId },
      include: { members: true },
    })

    if (!channel) throw new Error('El canal no existe, mi compa.')

    const requesterMember = channel.members.find((m: any) => m.userId === requesterId)
    if (!requesterMember) throw new Error('Tú ni estás en este grupo, no puedes invitar a nadie.')

    if (channel.isPrivate && requesterMember.role === MemberRole.USER) {
      throw new Error('Este grupo es privado. Solo los administradores pueden meter gente nueva.')
    }

    return await prisma.channelMember.create({
      data: {
        channelId: channelId,
        userId: targetUserId,
        role: MemberRole.USER,
      },
      include: { user: { select: { id: true, alias: true, firstName: true } } },
    })
  }

  // 5. NUEVO: Unirse a un canal por su nombre exacto
  async joinChannelByName(channelName: string, userId: string) {
    // Buscamos si existe un canal con ese nombre (que no sea privado)
    const channel = await prisma.channel.findFirst({
      where: {
        name: channelName,
        isPrivate: false,
      },
    })

    if (!channel) throw new Error('El canal no existe o es privado, mi compa.')

    // Si existe, agregamos al usuario que lo buscó
    return await prisma.channelMember.create({
      data: {
        channelId: channel.id,
        userId: userId,
        role: MemberRole.USER,
      },
    })
  }
}
