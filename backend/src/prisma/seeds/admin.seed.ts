import { PrismaClient, Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const existing = await prisma.user.findUnique({ where: { email: 'admin@booking.com' } });

  if (existing) {
    console.log('Admin already exists, skipping seed.');
    return;
  }

  const password = await bcrypt.hash('Admin@123', 10);

  const admin = await prisma.user.create({
    data: {
      name: 'Admin',  
      email: 'admin@booking.com',
      password,
      role: Role.ADMIN,
      isEmailVerified: true,
    },
  });

  console.log(`Admin created: ${admin.email}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
