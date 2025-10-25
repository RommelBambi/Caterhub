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
r.get('/cater-applications', async (req, res) => {
  const status = (req.query.status || 'PENDING').toString().toUpperCase();
  const q = (req.query.q || '').toString().trim();
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(50, Math.max(5, Number(req.query.limit) || 10));
  const where = {
    ...(status === 'ALL' ? {} : { status }),
    ...(q ? {
      OR: [
        { ownerName: { contains: q, mode: 'insensitive' } },
        { businessName: { contains: q, mode: 'insensitive' } },
        { email: { contains: q, mode: 'insensitive' } },
      ]
    } : {})
  };

  const [rows, total] = await Promise.all([
    prisma.caterApplication.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit
    }),
    prisma.caterApplication.count({ where })
  ]);

  res.json({ rows, total, page, limit, pages: Math.ceil(total / limit) });
});

export default r;
