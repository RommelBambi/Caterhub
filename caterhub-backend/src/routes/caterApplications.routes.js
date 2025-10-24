import { Router } from 'express';
import prisma from '../prismaClient.js';
import { authRequired } from '../middleware/auth.js';

const r = Router();

// Public submit (logged-in optional)
r.post('/', async (req, res) => {
  try {
    const { ownerName, businessName, email, phone, address } = req.body || {};
    if (!ownerName || !businessName || !email) {
      return res.status(400).json({ error: 'Missing fields' });
    }
    const row = await prisma.caterApplication.create({
      data: { ownerName, businessName, email, phone, address }
    });
    res.status(201).json(row);
  } catch (e) {
    console.error('cater-applications POST error:', e);
    res.status(400).json({ error: 'Submit failed' });
  }
});

// Authenticated submit (stores userId)
r.post('/me', authRequired, async (req, res) => {
  try {
    const { ownerName, businessName, email, phone, address } = req.body || {};
    const row = await prisma.caterApplication.create({
      data: { ownerName, businessName, email, phone, address, userId: req.user.id }
    });
    res.status(201).json(row);
  } catch (e) {
    console.error('cater-applications/me POST error:', e);
    res.status(400).json({ error: 'Submit failed' });
  }
});

export default r;
