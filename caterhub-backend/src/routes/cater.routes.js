import { Router } from 'express';
import prisma from '../prismaClient.js';
import { authRequired, requireRole } from '../middleware/auth.js';

const r = Router();

r.use(authRequired, requireRole('CATER'));

// Get bookings for services owned by this caterer
r.get('/bookings', async (req, res) => {
  const status = (req.query.status || 'ALL').toString().toUpperCase();
  const where = {
    service: { catererId: req.user.id },
    ...(status === 'ALL' ? {} : { status })
  };
  const rows = await prisma.booking.findMany({
    where,
    include: {
      service: true,
      customer: { select: { id: true, username: true, email: true } }
    },
    orderBy: { createdAt: 'desc' }
  });
  res.json(rows);
});

// Update booking status (CONFIRM / DECLINE / COMPLETE)
r.patch('/bookings/:id', async (req, res) => {
  const id = Number(req.params.id);
  const { action } = req.body || {};

  const b = await prisma.booking.findUnique({
    where: { id },
    include: { service: true }
  });
  if (!b || b.service?.catererId !== req.user.id) {
    return res.status(404).json({ error: 'Not found' });
  }

  const terminal = new Set(['CANCELLED', 'COMPLETED', 'DECLINED']);
  if (terminal.has(b.status)) {
    return res.status(400).json({ error: `Cannot change booking in ${b.status} state` });
  }

  const map = { CONFIRM: 'CONFIRMED', DECLINE: 'DECLINED', COMPLETE: 'COMPLETED' };
  const nextStatus = map[(action || '').toUpperCase()];
  if (!nextStatus) return res.status(400).json({ error: 'Invalid action' });

  const updated = await prisma.booking.update({ where: { id }, data: { status: nextStatus } });
  res.json(updated);
});

export default r;
