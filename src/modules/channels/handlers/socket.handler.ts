import { Server, Socket } from 'socket.io'
import { AuthenticatedSocket } from '../../../shared/middlewares/auth.socket'

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

  socket.on('ptt-start', (channelId: string) => {
    console.log(`🎙️ PTT START: ${user?.alias}`)
    socket.to(channelId).emit('ptt-status', {
      userId: user?.id,
      alias: user?.alias,
      isTalking: true,
    })
  })

  socket.on('ptt-end', (channelId: string) => {
    console.log(`🔇 PTT END: ${user?.alias}`)
    socket.to(channelId).emit('ptt-status', {
      userId: user?.id,
      alias: user?.alias,
      isTalking: false,
    })
  })

  // WebRTC señalización
  socket.on('webrtc-offer', (payload: { channelId: string; offer: any }) => {
    console.log(`📤 Offer de ${user?.alias} → canal ${payload.channelId}`)
    socket.to(payload.channelId).emit('webrtc-offer', {
      userId: user?.id,
      alias: user?.alias,
      offer: payload.offer,
    })
  })

  socket.on('webrtc-answer', (payload: { channelId: string; answer: any }) => {
    console.log(`📥 Answer de ${user?.alias} → canal ${payload.channelId}`)
    socket.to(payload.channelId).emit('webrtc-answer', {
      userId: user?.id,
      answer: payload.answer,
    })
  })

  socket.on('webrtc-ice-candidate', (payload: { channelId: string; candidate: any }) => {
    socket.to(payload.channelId).emit('webrtc-ice-candidate', {
      userId: user?.id,
      candidate: payload.candidate,
    })
  })

  // Audio por socket (backup + historial)
  socket.on('send-audio', (...args: any[]) => {
    console.log(`🔊 send-audio args:`, JSON.stringify(args).substring(0, 200))
    const payload = args[0]
    if (!payload?.channelId || !payload?.audioData) {
      console.log(`❌ Payload inválido:`, payload)
      return
    }
    console.log(`🔊 Audio de ${user?.alias} → canal ${payload.channelId} (${payload.audioData.length} chars)`)
    socket.to(payload.channelId).emit('receive-audio', {
      userId: user?.id,
      alias: user?.alias,
      audioData: payload.audioData,
    })
  })
}
