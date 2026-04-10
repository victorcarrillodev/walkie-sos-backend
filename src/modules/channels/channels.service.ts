import { prisma } from '../../shared/infra/prisma'
import { MemberRole } from '@prisma/client'

export class ChannelService {
  // 1. Crear un nuevo canal
  async createChannel(
    userId: string,
    data: { name: string; description?: string; password?: string; maxMessageDuration?: number },
  ) {
    if (!data.password) throw new Error('La contraseña es obligatoria.')

    // Verificar unicidad del nombre
    const exists = await prisma.channel.findUnique({ where: { name: data.name } })
    if (exists) throw new Error('Ya existe un grupo con ese nombre.')

    return await prisma.channel.create({
      data: {
        name: data.name,
        description: data.description,
        password: data.password,
        maxMessageDuration: data.maxMessageDuration || 60,
        isGroup: data.name.startsWith('direct_') ? false : true, // Los canales directos no son grupos
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

  // 3. Buscar canales públicos (para unirse) - OBSOLETO, ya no existen canales públicos sin contraseña
  async getPublicChannels() {
    return []
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

    if (requesterMember.role === MemberRole.USER) {
      throw new Error('Solo los administradores pueden meter gente nueva.')
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

  // 5. NUEVO: Unirse a un canal por su nombre exacto y contraseña
  async joinChannelByName(channelName: string, userId: string, passwordAttempt: string) {
    const channel = await prisma.channel.findUnique({
      where: { name: channelName },
    })

    if (!channel) throw new Error('El grupo no existe.')

    if (channel.password !== passwordAttempt) {
      throw new Error('La contraseña es incorrecta.')
    }

    // Verificar si ya es miembro
    const existingMember = await prisma.channelMember.findUnique({
      where: {
        userId_channelId: {
          userId: userId,
          channelId: channel.id,
        },
      },
    })

    if (existingMember) {
      throw new Error('Ya eres miembro de este grupo.')
    }

    return await prisma.channelMember.create({
      data: {
        channelId: channel.id,
        userId: userId,
        role: MemberRole.USER,
      },
    })
  }

  // 6. NUEVO: Obtener miembros de un canal
  async getChannelMembers(channelId: string) {
    return await prisma.channelMember.findMany({
      where: { channelId },
      include: {
        user: { select: { id: true, alias: true, firstName: true } },
      },
      orderBy: { joinedAt: 'asc' },
    })
  }

  // 7. NUEVO: Silenciar/desilenciar canal completo
  async toggleMuteChannel(channelId: string, requesterId: string, isMuted: boolean) {
    await this.verifyAdmin(channelId, requesterId)

    return await prisma.channel.update({
      where: { id: channelId },
      data: { isMuted },
    })
  }

  // 7.5 NUEVO: Actualizar ajustes del canal (contraseña, duración de msg)
  async updateChannelSettings(
    channelId: string,
    requesterId: string,
    data: { password?: string; maxMessageDuration?: number },
  ) {
    await this.verifyAdmin(channelId, requesterId)

    const updateData: any = {}
    if (data.password) updateData.password = data.password
    if (data.maxMessageDuration) updateData.maxMessageDuration = data.maxMessageDuration

    return await prisma.channel.update({
      where: { id: channelId },
      data: updateData,
    })
  }

  // 8. NUEVO: Penalizar a un miembro
  async penalizeMember(channelId: string, targetUserId: string, requesterId: string, minutes: number | null) {
    const requesterMember = await this.verifyAdminOrModerator(channelId, requesterId)

    if (targetUserId === requesterId) {
      throw new Error('No te puedes penalizar a ti mismo compa.')
    }

    let mutedUntil = null
    if (minutes !== null && minutes > 0) {
      mutedUntil = new Date(Date.now() + minutes * 60000)
    }

    // Buscamos al miembro a penalizar
    const targetMember = await prisma.channelMember.findUnique({
      where: { userId_channelId: { userId: targetUserId, channelId: channelId } },
    })

    if (!targetMember) throw new Error('El usuario no está en este grupo.')

    // Reglas de jerarquía
    if (targetMember.role === MemberRole.ADMIN) {
      throw new Error('No puedes penalizar a un Administrador.')
    }
    if (requesterMember.role === MemberRole.MODERATOR && targetMember.role === MemberRole.MODERATOR) {
      throw new Error('Un Moderador no puede penalizar a otro Moderador.')
    }

    return await prisma.channelMember.update({
      where: { id: targetMember.id },
      data: { mutedUntil },
    })
  }

  // 8.5 NUEVO: Cambiar rol de un miembro
  async changeMemberRole(channelId: string, targetUserId: string, requesterId: string, newRole: MemberRole) {
    await this.verifyAdmin(channelId, requesterId)

    if (targetUserId === requesterId) {
      throw new Error('No te puedes cambiar el rol a ti mismo (eres el patrón).')
    }

    const targetMember = await prisma.channelMember.findUnique({
      where: { userId_channelId: { userId: targetUserId, channelId: channelId } },
    })

    if (!targetMember) throw new Error('El usuario no está en este grupo.')
    if (targetMember.role === MemberRole.ADMIN) throw new Error('No puedes modificar a otro administrador.')

    return await prisma.channelMember.update({
      where: { id: targetMember.id },
      data: { role: newRole },
    })
  }

  // 9. NUEVO: Eliminar grupo
  async deleteChannel(channelId: string, requesterId: string) {
    const channel = await prisma.channel.findUnique({
      where: { id: channelId },
      include: { members: true },
    })

    if (!channel) throw new Error('El canal no existe.')

    // Solo el dueño puede eliminar el grupo
    if (channel.ownerId !== requesterId) {
      throw new Error('Solo el dueño puede destruir el grupo.')
    }

    // Prisma eliminará en cascada los miembros si está configurado, o los borramos a mano por si acaso
    await prisma.channelMember.deleteMany({ where: { channelId } })
    await prisma.channel.delete({ where: { id: channelId } })
    return { success: true }
  }

  // --- Helpers ---
  private async verifyAdmin(channelId: string, requesterId: string) {
    const member = await prisma.channelMember.findUnique({
      where: { userId_channelId: { userId: requesterId, channelId: channelId } },
    })

    if (!member) throw new Error('No perteneces a este grupo.')
    if (member.role !== MemberRole.ADMIN) throw new Error('Puro administrador puede hacer esto, mijo.')
    return member
  }

  private async verifyAdminOrModerator(channelId: string, requesterId: string) {
    const member = await prisma.channelMember.findUnique({
      where: { userId_channelId: { userId: requesterId, channelId: channelId } },
    })

    if (!member) throw new Error('No perteneces a este grupo.')
    if (member.role !== MemberRole.ADMIN && member.role !== MemberRole.MODERATOR) {
      throw new Error('Solo los Administradores o Moderadores pueden hacer esto.')
    }
    return member
  }
}
