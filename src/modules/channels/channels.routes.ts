import { Router } from 'express'
import { create, listMyChannels } from './channels.controller'

const router = Router()

router.post('/', create) // Crear canal
router.get('/mine', listMyChannels) // Mis canales

export default router
