import { Router } from 'express';
import prisma from '../prismaClient.js';

const r = Router();

// GET /api/services/:serviceId/packages
r.get('/services/:serviceId/packages', async (req, res) => {
  const serviceId = Number(req.params.serviceId);
  const rows = await prisma.servicePackage.findMany({ where: { serviceId } });
  res.json(rows.map(p => ({
    id: p.id,
    name: p.name,
    pricePerHead: p.pricePerHead,
    categories: p.categoriesJson, // expected by mobile FE
  })));
});

export default r;
