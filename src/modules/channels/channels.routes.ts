import { Router } from 'express'
import { create, listMyChannels, getPublic, addMember, joinChannel } from './channels.controller'
import { authMiddleware } from '../../shared/middlewares/auth.middleware'

const router = Router()

// Puro compa con gafete validado pasa de aquí
router.use(authMiddleware)

router.post('/', create) // Crear canal
router.get('/mine', listMyChannels) // Mis canales
router.get('/public', getPublic) // Explorar canales públicos
router.post('/join', joinChannel) // NUEVA RUTA: Unirse por nombre
router.post('/:channelId/members', addMember) // Meter a un compa a un grupo

export default router
