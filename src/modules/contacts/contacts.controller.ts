import { Response } from 'express'
import { ContactsService } from './contacts.service'
import { z } from 'zod'
import { AuthenticatedRequest } from '../../shared/middlewares/auth.middleware'

const contactsService = new ContactsService()

const addContactSchema = z.object({
  alias: z.string().min(3, 'El alias debe tener al menos 3 caracteres'),
})

export const getContacts = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id
    const contacts = await contactsService.getRecentContacts(userId)
    res.status(200).json(contacts)
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Error al obtener el historial' })
  }
}

export const addContact = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id
    const data = addContactSchema.parse(req.body)

    const result = await contactsService.addContactByAlias(userId, data.alias)
    res.status(201).json(result)
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: error.issues.map((e) => e.message).join(', ') })
      return
    }
    res.status(400).json({ error: error.message })
  }
}
