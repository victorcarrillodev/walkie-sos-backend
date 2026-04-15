import { prisma } from '../../shared/infra/prisma'

export class ContactsService {
  async getRecentContacts(userId: string) {
    const contacts = await prisma.contact.findMany({
      where: { userId: userId },
      orderBy: { lastContactedAt: 'desc' },
      include: {
        contactUser: {
          select: {
            id: true,
            alias: true,
            firstName: true,
            lastName: true,
            avatarUrl: true,
          },
        },
      },
    })

    return contacts.map((c) => ({
      contactId: c.contactUser.id,
      alias: c.contactUser.alias,
      name: `${c.contactUser.firstName} ${c.contactUser.lastName}`,
      avatarUrl: c.contactUser.avatarUrl,
      lastContactedAt: c.lastContactedAt,
    }))
  }

  async addContactByAlias(userId: string, targetAlias: string) {
    const cleanedAlias = targetAlias.startsWith('@') ? targetAlias.slice(1) : targetAlias

    const targetUser = await prisma.user.findUnique({
      where: { alias: cleanedAlias },
    })

    if (!targetUser) {
      throw new Error('No se encontró a ningún compa con ese alias.')
    }
    if (targetUser.id === userId) {
      throw new Error('No te puedes agregar a ti mismo, no sea cabrón.')
    }

    // Transacción: O se hacen los dos, o no se hace ninguno
    await prisma.$transaction([
      prisma.contact.upsert({
        where: { userId_contactId: { userId: userId, contactId: targetUser.id } },
        update: { lastContactedAt: new Date() },
        create: { userId: userId, contactId: targetUser.id },
      }),
      prisma.contact.upsert({
        where: { userId_contactId: { userId: targetUser.id, contactId: userId } },
        update: { lastContactedAt: new Date() },
        create: { userId: targetUser.id, contactId: userId },
      }),
    ])

    return {
      message: 'Compa agregado exitosamente al batallón',
      contact: {
        id: targetUser.id,
        alias: targetUser.alias,
        name: `${targetUser.firstName} ${targetUser.lastName}`,
        avatarUrl: targetUser.avatarUrl,
      },
    }
  }
}
