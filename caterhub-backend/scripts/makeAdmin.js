import prisma from '../src/prismaClient.js';

const email = 'admin@gmail.com';
const username = 'admin123';
const passwordHash = '$2b$10$8i5I3RrjJpOaJfZf8mAIOe0l8zC4n9j2n1oX7GmXb8W7k2T5b3y2q'; // "Abcd1234!" bcrypt(10) example if your auth expects hash

const run = async () => {
  let u = await prisma.user.findUnique({ where: { email }});
  if (!u) {
    u = await prisma.user.create({ data: { email, username, password: passwordHash, role: 'ADMIN' }});
  } else if (u.role !== 'ADMIN') {
    u = await prisma.user.update({ where: { id: u.id }, data: { role: 'ADMIN' }});
  }
  console.log('Admin user:', u);
  process.exit(0);
};
run().catch(e => { console.error(e); process.exit(1); });
