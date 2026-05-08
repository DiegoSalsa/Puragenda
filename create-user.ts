import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcrypt'

const prisma = new PrismaClient()

async function main() {
  const hash = await bcrypt.hash('lucas2323', 10)
  await prisma.user.upsert({
    where: { email: 'lucas23@gmail.com' },
    update: {},
    create: {
      email: 'lucas23@gmail.com',
      password: hash,
      name: 'Lucas',
      role: 'ADMIN',
      isSuperAdmin: true,
    }
  })
  console.log('User created: lucas23@gmail.com')
}

main().finally(() => prisma.$disconnect())