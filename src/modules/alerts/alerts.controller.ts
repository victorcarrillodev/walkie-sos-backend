import { Response } from 'express'
import { AlertsService } from './alerts.service'
import { AuthenticatedRequest } from '../../shared/middlewares/auth.middleware'

const alertsService = new AlertsService()

export const getActiveAlerts = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const channelId = req.params.channelId as string

    // TODO: Como mejora de alto valor, aquí podríamos validar si el req.user.id
    // realmente pertenece a este channelId antes de darle la información.

    const alerts = await alertsService.getActiveAlertsByChannel(channelId)
    res.status(200).json(alerts)
  } catch (error: any) {
    res.status(500).json({ error: 'Error al buscar alertas activas: ' + error.message })
  }
}

export const getMyHistory = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id
    const history = await alertsService.getMyAlertHistory(userId)
    res.status(200).json(history)
  } catch (error: any) {
    res.status(500).json({ error: 'Error al obtener tu historial: ' + error.message })
  }
}
