import { Router } from 'express'
import { getContacts, addContact } from './contacts.controller'
import { authMiddleware } from '../../shared/middlewares/auth.middleware'

const router = Router()

// Puro compa autenticado pasa por aquí
router.use(authMiddleware)

router.get('/', getContacts)
router.post('/add', addContact)

export default router
