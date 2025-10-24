import { Router } from 'express';
import prisma from '../prismaClient.js';
import { authRequired } from '../middleware/auth.js';

const r = Router();
r.use(authRequired);

// PATCH /api/users/me  { location?: string }
r.patch('/me', async (req, res) => {
  const { location } = req.body;
  const user = await prisma.user.update({
    where: { id: req.user.id },
    data: { location },
    select: { id: true, email: true, username: true, role: true, location: true },
  });
  res.json(user);
});

export default r;
