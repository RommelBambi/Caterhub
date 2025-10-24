import { Router } from 'express';
import { listServices, getService, topServices } from '../controllers/service.controller.js';

const r = Router();

r.get('/', listServices);
r.get('/top', topServices);
r.get('/:id', getService);

export default r;
