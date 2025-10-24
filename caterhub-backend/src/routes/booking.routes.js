// src/routes/booking.routes.js
import { Router } from 'express';
import prisma from '../prismaClient.js';
import { authRequired } from '../middleware/auth.js';

const router = Router();

/** Create booking */
router.post('/', authRequired, async (req, res) => {
  try {
    const { serviceId, eventDate, guests, notes } = req.body;
    const booking = await prisma.booking.create({
      data: {
        serviceId: Number(serviceId),
        customerId: req.user.id,
        eventDate: new Date(eventDate),
        guests: Number(guests),
        notes: notes ?? null,
        status: 'PENDING',
      },
    });
    res.status(201).json(booking);
  } catch (e) {
    console.error(e);
    res.status(400).json({ error: 'Create booking failed' });
  }
});

/** List my bookings */
router.get('/me', authRequired, async (req, res) => {
  try {
    const list = await prisma.booking.findMany({
      where: { customerId: req.user.id },
      orderBy: { createdAt: 'desc' },
      include: { service: true },
    });
    res.json(list);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Fetch bookings failed' });
  }
});

/** Get a single booking (for details page) */
router.get('/:id', authRequired, async (req, res) => {
  try {
    const id = Number(req.params.id);
    const b = await prisma.booking.findFirst({
      where: { id, customerId: req.user.id },
      include: { service: true },
    });
    if (!b) return res.status(404).json({ error: 'Not found' });
    res.json(b);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Fetch booking failed' });
  }
});

/** Update/CANCEL a booking I own */
router.patch('/:id', authRequired, async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { status } = req.body;

    const b = await prisma.booking.findUnique({ where: { id } });
    if (!b || b.customerId !== req.user.id) {
      return res.status(404).json({ error: 'Not found' });
    }
    // Only allow cancelling if not already terminal
    const terminal = new Set(['CANCELLED', 'COMPLETED', 'DECLINED']);
    if (terminal.has(b.status)) {
      return res.status(400).json({ error: `Cannot change booking in ${b.status} state` });
    }

    const next = (status || 'CANCELLED').toUpperCase();
    if (next !== 'CANCELLED') {
      return res.status(400).json({ error: 'Only CANCELLED is allowed for customers' });
    }

    const updated = await prisma.booking.update({
      where: { id },
      data: { status: 'CANCELLED' },
    });
    res.json(updated);
  } catch (e) {
    console.error(e);
    res.status(400).json({ error: 'Update booking failed' });
  }
});

export default router;
