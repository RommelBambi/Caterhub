import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

export async function listServices(req, res) {
  try {
    const rows = await prisma.service.findMany({
      include: { _count: { select: { favorites: true, bookings: true } } },
      orderBy: { id: 'asc' },
    });
    res.json(
      rows.map(s => ({
        ...s,
        favoritesCount: s._count?.favorites ?? 0,
        bookingsCount: s._count?.bookings ?? 0,
      }))
    );
  } catch (e) {
    console.error('listServices error:', e?.message, e?.stack);
    res.status(500).json({ error: 'Failed to fetch services' });
  }
}

export async function topServices(req, res) {
  try {
    const by = (req.query.by || 'likes').toString();
    const limit = Math.max(1, Math.min(50, parseInt(req.query.limit || '8', 10)));
    const orderBy =
      by === 'bookings'
        ? { bookings: { _count: 'desc' } }
        : { favorites: { _count: 'desc' } };

    const rows = await prisma.service.findMany({
      take: limit,
      orderBy,
      include: { _count: { select: { favorites: true, bookings: true } } },
    });

    res.json(
      rows.map(s => ({
        ...s,
        favoritesCount: s._count?.favorites ?? 0,
        bookingsCount: s._count?.bookings ?? 0,
      }))
    );
  } catch (e) {
    console.error('topServices error:', e?.message, e?.stack);
    res.status(500).json({ error: 'Failed to fetch top services' });
  }
}

export async function getService(req, res) {
  try {
    const id = Number.parseInt(req.params.id, 10);
    if (!Number.isFinite(id)) return res.status(400).json({ error: 'Invalid id' });

    // fetch base first (avoids relation/_count edge-case crashes)
    const base = await prisma.service.findUnique({ where: { id } });
    if (!base) return res.status(404).json({ error: 'Service not found' });

    // counts separately (very stable)
    const favoritesCount = await prisma.favorite.count({ where: { serviceId: id } });
    const bookingsCount  = await prisma.booking.count({ where: { serviceId: id } });

    res.json({ ...base, favoritesCount, bookingsCount });
  } catch (e) {
    console.error('getService error:', e?.message, e?.stack);
    res.status(500).json({ error: 'Failed to fetch service' });
  }
}
