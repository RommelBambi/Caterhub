import { PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  // upsert demo users
  const pw = await bcrypt.hash('Abcd1234!', 10);
  const caterer = await prisma.user.upsert({
    where: { email: 'cat@demo.com' },
    update: {},
    create: { email: 'cat@demo.com', username: 'caterer1', password: pw, role: 'CATER' }
  });

  await prisma.user.upsert({
    where: { email: 'cust@demo.com' },
    update: {},
    create: { email: 'cust@demo.com', username: 'customer1', password: pw, role: 'CUSTOMER' }
  });

  // services
  await prisma.service.createMany({
    data: [
      { name: 'Delicioso Catering', description: 'Home-style Filipino buffet', pricePerHead: 650, imageUrl: '', catererId: caterer.id },
      { name: 'Savory Events', description: 'Formal plated events', pricePerHead: 780, imageUrl: '', catererId: caterer.id },
      { name: 'Gourmet Grub', description: 'Premium selections', pricePerHead: 900, imageUrl: '', catererId: caterer.id },
    ],
    skipDuplicates: true
  });

  console.log('Seed ok');
}

main().finally(() => prisma.$disconnect());

// sample CaterApplication
await prisma.caterApplication.create({
  data: { ownerName: 'Ana Cruz', businessName: 'Fiesta Feast', email: 'ana@fiestafeast.example', address: 'Quezon City, PH' }
});

// sample package on any service
const anyService = await prisma.service.findFirst();
if (anyService) {
  await prisma.servicePackage.create({
    data: {
      serviceId: anyService.id,
      name: 'Standard Buffet',
      pricePerHead: 650,
      categoriesJson: {
        id: 'cat-rice', name: 'Rice', required: true,
        options: [ { id: 'opt-garlic', name: 'Garlic Rice' }, { id: 'opt-plain', name: 'Plain Rice' } ]
      }
    }
  });
}
