import { Router } from 'express';
import prisma from '../prismaClient.js';
import { authRequired, requireRole } from '../middleware/auth.js';

const r = Router();

r.use(authRequired, requireRole('ADMIN'));

// List applications
r.get('/cater-applications', async (req, res) => {
  const status = (req.query.status || 'PENDING').toString().toUpperCase();
  const where = status === 'ALL' ? {} : { status };
  const rows = await prisma.caterApplication.findMany({
    where,
    orderBy: { createdAt: 'desc' }
  });
  res.json(rows);
});

// Approve / Reject
r.patch('/cater-applications/:id', async (req, res) => {
  const id = Number(req.params.id);
  const { action, note } = req.body || {};
  const now = new Date();

  if (!['APPROVE', 'REJECT'].includes((action || '').toUpperCase())) {
    return res.status(400).json({ error: 'Invalid action' });
  }

  const updated = await prisma.caterApplication.update({
    where: { id },
    data: {
      status: action.toUpperCase() === 'APPROVE' ? 'APPROVED' : 'REJECTED',
      reviewedById: req.user.id,
      reviewedAt: now,
      adminNote: note ?? null,
    }
  });

  // If linked to a user, promote to CATER on approve
  if (updated.status === 'APPROVED' && updated.userId) {
    await prisma.user.update({ where: { id: updated.userId }, data: { role: 'CATER' } });
  }

  res.json(updated);
});

export default r;
