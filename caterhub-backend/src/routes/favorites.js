import { Router } from 'express';
import prisma from '../prismaClient.js';          // your prisma singleton
import { authRequired } from '../middleware/auth.js';

const r = Router();
r.use(authRequired);

// GET /api/favorites/me  -> list of favorite services for current user
r.get('/me', async (req, res) => {
  const favs = await prisma.favorite.findMany({
    where: { userId: req.user.id },
    include: { service: true },
    orderBy: { createdAt: 'desc' },
  });
  res.json(favs.map(f => f.service));
});

// POST /api/favorites/:serviceId
r.post('/:serviceId', async (req, res) => {
  const serviceId = Number(req.params.serviceId);
  try {
    const fav = await prisma.favorite.create({
      data: { userId: req.user.id, serviceId }
    });
    res.status(201).json(fav);
  } catch (e) {
    // unique violation = already exists; still return 201-ish semantics
    res.status(200).json({ ok: true });
  }
});

// DELETE /api/favorites/:serviceId
r.delete('/:serviceId', async (req, res) => {
  const serviceId = Number(req.params.serviceId);
  await prisma.favorite.deleteMany({ where: { userId: req.user.id, serviceId } });
  res.json({ ok: true });
});

export default r;
