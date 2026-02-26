import { prisma } from '../../shared/infra/prisma'
import { AlertStatus } from '@prisma/client'

export class AlertsService {
  // 1. Revisar si hay una alerta activa en un grupo específico
  async getActiveAlertsByChannel(channelId: string) {
    const alerts = await prisma.alert.findMany({
      where: {
        channelId: channelId,
        status: AlertStatus.ACTIVE, // Solo las que están encendidas
      },
      include: {
        user: {
          select: { id: true, alias: true, firstName: true, avatarUrl: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    })
    return alerts
  }

  // 2. Historial de alertas que yo he mandado (Para el perfil del usuario)
  async getMyAlertHistory(userId: string) {
    const alerts = await prisma.alert.findMany({
      where: { userId: userId },
      orderBy: { createdAt: 'desc' },
      take: 20, // Traemos solo las últimas 20 para no saturar
    })
    return alerts
  }
}
