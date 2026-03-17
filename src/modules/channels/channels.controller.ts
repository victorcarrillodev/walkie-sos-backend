import { Response } from 'express'
import { ChannelService } from './channels.service'
import { AuthenticatedRequest } from '../../shared/middlewares/auth.middleware'
import { z } from 'zod'

const channelService = new ChannelService()

// Validaciones firmes con Zod
const createGroupSchema = z.object({
  name: z.string().min(3, 'El nombre debe tener al menos 3 letras'),
  description: z.string().optional(),
  isPrivate: z.boolean().optional(),
  accessKey: z.string().optional(),
})

const addMemberSchema = z.object({
  targetUserId: z.string().uuid('El ID del usuario no es válido'),
})

const joinByNameSchema = z.object({
  name: z.string().min(1, 'El nombre del canal es obligatorio'),
})

const toggleMuteSchema = z.object({
  isMuted: z.boolean(),
})

const penalizeMemberSchema = z.object({
  minutes: z.number().nullable(), // null para quitar castigo
})

export const create = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id
    const data = createGroupSchema.parse(req.body)

    const channel = await channelService.createChannel(userId, data)
    res.status(201).json(channel)
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: error.issues.map((e) => e.message).join(', ') })
      return
    }
    res.status(400).json({ error: error.message })
  }
}

export const listMyChannels = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id
    const channels = await channelService.getUserChannels(userId)
    res.json(channels)
  } catch (error: any) {
    res.status(500).json({ error: 'Fallo al obtener los grupos: ' + error.message })
  }
}

export const getPublic = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const channels = await channelService.getPublicChannels()
    res.json(channels)
  } catch (error: any) {
    res.status(500).json({ error: 'Error al buscar canales públicos' })
  }
}

export const addMember = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const requesterId = req.user!.id

    // AQUÍ ESTÁ LA MAGIA, MI COMPA: Forzamos a que TypeScript entienda que es un string
    const channelId = req.params.channelId as string

    const data = addMemberSchema.parse(req.body)

    const newMember = await channelService.addMemberToGroup(channelId, data.targetUserId, requesterId)
    res.status(201).json({ message: 'Compa agregado al batallón', member: newMember })
  } catch (error: any) {
    // Manejo de error cuando intentan meter a alguien que ya está adentro
    if (error.code === 'P2002') {
      res.status(400).json({ error: 'Este compa ya está en el grupo.' })
      return
    }
    res.status(400).json({ error: error.message })
  }
}

export const joinChannel = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id
    const data = joinByNameSchema.parse(req.body)

    const newMember = await channelService.joinChannelByName(data.name, userId)
    res.status(200).json({ message: 'Te has unido al canal con éxito', member: newMember })
  } catch (error: any) {
    // Si da el error P2002 de Prisma, significa que el usuario ya estaba en el grupo
    if (error.code === 'P2002') {
      res.status(400).json({ error: 'Ya eres miembro de este grupo.' })
      return
    }
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: error.issues.map((e) => e.message).join(', ') })
      return
    }
    res.status(400).json({ error: error.message })
  }
}

export const getMembers = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const channelId = req.params.channelId as string
    const members = await channelService.getChannelMembers(channelId)
    res.json(members)
  } catch (error: any) {
    res.status(400).json({ error: error.message })
  }
}

export const toggleMute = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const requesterId = req.user!.id
    const channelId = req.params.channelId as string
    const data = toggleMuteSchema.parse(req.body)

    const updated = await channelService.toggleMuteChannel(channelId, requesterId, data.isMuted)
    res.json({ message: data.isMuted ? 'Grupo silenciado' : 'Grupo desilenciado', channel: updated })
  } catch (error: any) {
    res.status(400).json({ error: error.message })
  }
}

export const penalize = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const requesterId = req.user!.id
    const channelId = req.params.channelId as string
    const targetUserId = req.params.userId as string
    const data = penalizeMemberSchema.parse(req.body)

    await channelService.penalizeMember(channelId, targetUserId, requesterId, data.minutes)
    res.json({ message: data.minutes ? `Usuario penalizado por ${data.minutes} minutos.` : 'Penalización retirada.' })
  } catch (error: any) {
    res.status(400).json({ error: error.message })
  }
}

export const destroy = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const requesterId = req.user!.id
    const channelId = req.params.channelId as string

    await channelService.deleteChannel(channelId, requesterId)
    res.json({ message: 'Grupo destruido exitosamente.' })
  } catch (error: any) {
    res.status(400).json({ error: error.message })
  }
}
