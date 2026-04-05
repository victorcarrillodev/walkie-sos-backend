import { Server, Socket } from 'socket.io'
import { AuthenticatedSocket } from '../../../shared/middlewares/auth.socket'
import { prisma } from '../../../shared/infra/prisma'
import { MemberRole } from '@prisma/client'
// Helper para verificar permisos de voz
const canUserTalk = async (channelId: string, userId: string): Promise<{ allowed: boolean; reason?: string }> => {
  // Manejo de canales directos (virtuales, sin registro en base de datos)
  if (channelId.startsWith('direct_')) {
    const parts = channelId.split('_')
    if (parts.length >= 3 && (parts[1] === userId || parts[2] === userId)) {
      return { allowed: true }
    }
    return { allowed: false, reason: 'No formas parte de esta charla directa.' }
  }
  try {
    const channel = await prisma.channel.findUnique({
      where: { id: channelId },
      include: {
        members: {
          where: { userId },
        },
      },
    })
    if (!channel) return { allowed: false, reason: 'El canal no existe.' }
    const member = channel.members[0]
    if (!member) return { allowed: false, reason: 'No perteneces a este grupo.' }
    // Si tiene penalización por tiempo
    if (member.mutedUntil && member.mutedUntil > new Date()) {
      return { allowed: false, reason: 'Estás penalizado o silenciado temporalmente.' }
    }
    // Si el grupo está silenciado y no es admin
    if (channel.isMuted && member.role !== MemberRole.ADMIN) {
      return { allowed: false, reason: 'El administrador ha silenciado este grupo.' }
    }
    return { allowed: true }
  } catch (error) {
    console.error('❌ Error en canUserTalk:', error)
    return { allowed: false, reason: 'Error interno verificando permisos del grupo.' }
  }
}
export const registerChannelHandlers = (io: Server, socket: Socket) => {
  const authSocket = socket as AuthenticatedSocket
  const user = authSocket.user
  if (user?.id) {
    socket.join(user.id)
    console.log(`📡 [${user.alias}] conectado`)
  }
  socket.on('join-channel', (channelId: string) => {
    socket.join(channelId)
    console.log(`📻 [${user?.alias}] sintonizó: ${channelId}`)
    socket.to(channelId).emit('channel-event', {
      type: 'JOINED',
      message: `${user?.alias} se unió`,
      userId: user?.id,
    })
  })
  socket.on('leave-channel', (channelId: string) => {
    socket.leave(channelId)
  })
  socket.on('ptt-start', async (channelId: string) => {
    if (!user?.id) return
    const check = await canUserTalk(channelId, user.id)
    if (!check.allowed) {
      socket.emit('talk-error', { message: check.reason })
      return
    }
    console.log(`🎙️ PTT START: ${user?.alias}`)
    socket.to(channelId).emit('ptt-status', {
      channelId: channelId,
      userId: user?.id,
      alias: user?.alias,
      isTalking: true,
    })
  })
  socket.on('ptt-end', (channelId: string) => {
    console.log(`🔇 PTT END: ${user?.alias}`)
    socket.to(channelId).emit('ptt-status', {
      channelId: channelId,
      userId: user?.id,
      alias: user?.alias,
      isTalking: false,
    })
  })
  // WebRTC señalización
  socket.on('webrtc-offer', async (payload: { channelId: string; offer: any }) => {
    if (!user?.id) return
    const check = await canUserTalk(payload.channelId, user.id)
    if (!check.allowed) return
    console.log(`📤 Offer de ${user?.alias} → canal ${payload.channelId}`)
    socket.to(payload.channelId).emit('webrtc-offer', {
      channelId: payload.channelId,
      userId: user?.id,
      alias: user?.alias,
      offer: payload.offer,
    })
  })
  socket.on('webrtc-answer', async (payload: { channelId: string; answer: any }) => {
    if (!user?.id) return
    const check = await canUserTalk(payload.channelId, user.id)
    if (!check.allowed) return
    console.log(`📥 Answer de ${user?.alias} → canal ${payload.channelId}`)
    socket.to(payload.channelId).emit('webrtc-answer', {
      channelId: payload.channelId,
      userId: user?.id,
      answer: payload.answer,
    })
  })
  socket.on('webrtc-ice-candidate', async (payload: { channelId: string; candidate: any }) => {
    if (!user?.id) return
    const check = await canUserTalk(payload.channelId, user.id)
    if (!check.allowed) return
    socket.to(payload.channelId).emit('webrtc-ice-candidate', {
      channelId: payload.channelId,
      userId: user?.id,
      candidate: payload.candidate,
    })
  })
  // Audio por socket (backup + historial)
  socket.on('send-audio', async (...args: any[]) => {
    if (!user?.id) return
    const payload = args[0]
    if (!payload?.channelId || !payload?.audioData) {
      console.log(`❌ Payload inválido:`, payload)
      return
    }
    // Doble check por si lograron bypassear el ptt-start
    const check = await canUserTalk(payload.channelId, user.id)
    if (!check.allowed) return
    console.log(`🔊 Audio de ${user?.alias} → canal ${payload.channelId} (${payload.audioData.length} chars)`)
    socket.to(payload.channelId).emit('receive-audio', {
      channelId: payload.channelId,
      userId: user?.id,
      alias: user?.alias,
      audioData: payload.audioData,
    })
  })
  // Consulta manual de estado en línea (un usuario)
  socket.on('check-online-status', async (targetUserId: string) => {
    const socketsInRoom = await io.in(targetUserId).fetchSockets()
    const isOnline = socketsInRoom.length > 0
    socket.emit('online-status', {
      userId: targetUserId,
      isOnline,
    })
  })
  // Consulta masiva de estado en línea (múltiples usuarios)
  socket.on('check-users-status', async (userIds: string[]) => {
    if (!Array.isArray(userIds)) return
    const results: { userId: string; isOnline: boolean }[] = []
    for (const userId of userIds) {
      const socketsInRoom = await io.in(userId).fetchSockets()
      results.push({ userId, isOnline: socketsInRoom.length > 0 })
    }
    socket.emit('users-status', results)
  })
}
