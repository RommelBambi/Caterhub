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

r.get('/metrics', async (_req, res) => {
  const startOfDay = new Date(); startOfDay.setHours(0,0,0,0);
  const startOfWeek = new Date(startOfDay); startOfWeek.setDate(startOfWeek.getDate() - ((startOfDay.getDay()+6)%7)); // Monday week

  const [
    appsPending, appsApproved, appsRejected,
    usersTotal, usersCater, usersCustomer, usersAdmin,
    servicesTotal,
    bookingsTotal, bookingsToday, bookingsWeek
  ] = await Promise.all([
    prisma.caterApplication.count({ where: { status: 'PENDING' } }),
    prisma.caterApplication.count({ where: { status: 'APPROVED' } }),
    prisma.caterApplication.count({ where: { status: 'REJECTED' } }),
    prisma.user.count(),
    prisma.user.count({ where: { role: 'CATER' } }),
    prisma.user.count({ where: { role: 'CUSTOMER' } }),
    prisma.user.count({ where: { role: 'ADMIN' } }),
    prisma.service.count(),
    prisma.booking.count(),
    prisma.booking.count({ where: { createdAt: { gte: startOfDay }}}),
    prisma.booking.count({ where: { createdAt: { gte: startOfWeek }}})
  ]);

  res.json({
    applications: { pending: appsPending, approved: appsApproved, rejected: appsRejected },
    users: { total: usersTotal, admins: usersAdmin, caterers: usersCater, customers: usersCustomer },
    services: { total: servicesTotal },
    bookings: { total: bookingsTotal, today: bookingsToday, thisWeek: bookingsWeek },
  });
});

// --- Users: list with search/pagination ---
r.get('/users', async (req, res) => {
  const q = (req.query.q || '').toString().trim();
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(50, Math.max(5, Number(req.query.limit) || 10));

  const where = q ? {
    OR: [
      { email: { contains: q, mode: 'insensitive' } },
      { username: { contains: q, mode: 'insensitive' } }
    ]
  } : {};

  const [rows, total] = await Promise.all([
    prisma.user.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      select: { id:true, email:true, username:true, role:true, createdAt:true },
      skip: (page-1)*limit, take: limit
    }),
    prisma.user.count({ where })
  ]);

  res.json({ rows, total, page, limit, pages: Math.ceil(total/limit) });
});

// --- Users: update role ---
r.patch('/users/:id/role', async (req, res) => {
  const id = Number(req.params.id);
  const { role } = req.body || {};
  if (!['ADMIN','CATER','CUSTOMER'].includes((role||'').toUpperCase())) {
    return res.status(400).json({ error: 'Invalid role' });
  }
  const updated = await prisma.user.update({
    where: { id },
    data: { role: role.toUpperCase() }
  });
  res.json({ id: updated.id, role: updated.role });
});

r.get('/bookings', async (req, res) => {
  const status = (req.query.status || 'ALL').toString().toUpperCase();
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(50, Math.max(5, Number(req.query.limit) || 10));
  const where = status === 'ALL' ? {} : { status };

  const [rows, total] = await Promise.all([
    prisma.booking.findMany({
      where,
      include: {
        service: { select: { id:true, name:true, catererId:true } },
        customer: { select: { id:true, username:true, email:true } }
      },
      orderBy: { createdAt: 'desc' },
      skip: (page-1)*limit, take: limit
    }),
    prisma.booking.count({ where })
  ]);
  res.json({ rows, total, page, limit, pages: Math.ceil(total/limit) });
});

export default r;
