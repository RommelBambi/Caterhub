import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

export const createBooking = async (req, res) => {
  const { serviceId, eventDate, guests, notes } = req.body;
  if (!serviceId || !eventDate || !guests) return res.status(400).json({ error: 'Missing fields' });

  const booking = await prisma.booking.create({
    data: {
      serviceId: Number(serviceId),
      customerId: req.user.id,
      eventDate: new Date(eventDate),
      guests: Number(guests),
      notes: notes ?? null
    }
  });
  res.status(201).json(booking);
};

export const myBookings = async (req, res) => {
  const data = await prisma.booking.findMany({
    where: { customerId: req.user.id },
    orderBy: { id: 'desc' },
    include: { service: true }
  });
  res.json(data);
};
