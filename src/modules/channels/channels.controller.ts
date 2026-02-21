import { Request, Response } from 'express'
import { ChannelService } from './channels.service'
import { verifyToken } from '../../shared/utils/jwt'

const channelService = new ChannelService()

// Helper rápido para sacar ID del token (esto debería ir en un middleware real)
const getUserId = (req: Request) => {
  const token = req.headers.authorization?.replace('Bearer ', '')
  if (!token) throw new Error('No token')
  const decoded = verifyToken(token)
  return decoded.id
}

export const create = async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req)
    const channel = await channelService.createChannel(userId, req.body)
    res.status(201).json(channel)
  } catch (error: any) {
    res.status(400).json({ error: error.message })
  }
}

export const listMyChannels = async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req)
    const channels = await channelService.getUserChannels(userId)
    res.json(channels)
  } catch (error: any) {
    res.status(401).json({ error: 'No autorizado' })
  }
}
