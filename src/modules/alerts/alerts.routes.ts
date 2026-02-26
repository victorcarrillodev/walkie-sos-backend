import { Router } from 'express'
import { getActiveAlerts, getMyHistory } from './alerts.controller'
import { authMiddleware } from '../../shared/middlewares/auth.middleware'

const router = Router()

// Puro compa validado pasa
router.use(authMiddleware)

// GET /api/alerts/channel/:channelId/active -> Ver si hay pedo en el grupo
router.get('/channel/:channelId/active', getActiveAlerts)

// GET /api/alerts/history -> Ver mi historial de pánicos
router.get('/history', getMyHistory)

export default router
