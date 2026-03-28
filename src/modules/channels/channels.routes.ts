import { Router } from 'express'
import { create, listMyChannels, getPublic, addMember, joinChannel, getMembers, toggleMute, penalize, changeRole, destroy } from './channels.controller'
import { authMiddleware } from '../../shared/middlewares/auth.middleware'

const router = Router()

// Puro compa con gafete validado pasa de aquí
router.use(authMiddleware)

router.post('/', create) // Crear canal
router.get('/mine', listMyChannels) // Mis canales
router.get('/public', getPublic) // Explorar canales públicos
router.post('/join', joinChannel) // NUEVA RUTA: Unirse por nombre
router.post('/:channelId/members', addMember) // Meter a un compa a un grupo

// NUEVAS RUTAS DE ADMINISTRACIÓN
router.get('/:channelId/members', getMembers) // Listar miembros
router.patch('/:channelId/mute', toggleMute) // Silenciar/desilenciar grupo
router.patch('/:channelId/members/:userId/penalize', penalize) // Penalizar o quitar castigo
router.patch('/:channelId/members/:userId/role', changeRole) // Cambiar rol (ADMIN a MODERADOR)
router.delete('/:channelId', destroy) // Eliminar grupo

export default router
