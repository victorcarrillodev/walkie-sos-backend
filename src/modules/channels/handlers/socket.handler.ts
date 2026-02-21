import { Server, Socket } from 'socket.io'
import { AuthenticatedSocket } from '../../../shared/middlewares/auth.socket'

export const registerChannelHandlers = (io: Server, socket: Socket) => {
  const authSocket = socket as AuthenticatedSocket
  const user = authSocket.user // Datos del usuario autenticado (id, username)

  // 1. Unirse a una Frecuencia (Canal)
  socket.on('join-channel', (channelId: string) => {
    // TODO: Aquí podrías validar en DB si el usuario tiene permiso de entrar
    socket.join(channelId)
    console.log(`📻 ${user?.username} sintonizó el canal ${channelId}`)

    // Avisar a los demás que alguien entró (Opcional)
    socket.to(channelId).emit('channel-event', {
      type: 'JOINED',
      message: `${user?.username} se ha unido.`,
      userId: user?.id,
    })
  })

  // 2. Salir de la Frecuencia
  socket.on('leave-channel', (channelId: string) => {
    socket.leave(channelId)
    console.log(`🔇 ${user?.username} salió del canal ${channelId}`)
  })

  // 3. PTT (Push To Talk) - Estado
  // Avisa a la UI de los demás que "Alguien está hablando" para bloquear su botón
  socket.on('ptt-start', (channelId: string) => {
    socket.to(channelId).emit('ptt-status', {
      userId: user?.id,
      username: user?.username,
      isTalking: true,
    })
  })

  socket.on('ptt-end', (channelId: string) => {
    socket.to(channelId).emit('ptt-status', {
      userId: user?.id,
      isTalking: false,
    })
  })

  // 4. STREAM DE VOZ (El núcleo del Walkie Talkie)
  // Recibimos un chunk de audio binario y lo retransmitimos
  socket.on('voice-stream', (payload: { channelId: string; audioChunk: ArrayBuffer }) => {
    const { channelId, audioChunk } = payload

    // Seguridad: Verificar que el socket esté realmente unido a ese canal
    if (!socket.rooms.has(channelId)) {
      console.warn(`⚠️ Usuario ${user?.username} intentó transmitir sin unirse al canal.`)
      return
    }

    // Broadcast: Enviar a todos en el canal MENOS al que habla
    socket.to(channelId).emit('voice-stream', {
      userId: user?.id,
      audioChunk: audioChunk, // Enviamos el buffer tal cual
    })
  })
}
