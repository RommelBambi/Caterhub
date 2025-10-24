// src/app.js
import express from 'express';
import cors from 'cors';

import authRoutes from './routes/auth.routes.js';
import serviceRoutes from './routes/service.routes.js';
import bookingRoutes from './routes/booking.routes.js';
import favoritesRoute from './routes/favorites.js';
import usersRoute from './routes/users.js';

// NEW: Milestone 3 routes
import caterApplicationsRoutes from './routes/caterApplications.routes.js';
import adminRoutes from './routes/admin.routes.js';
import caterRoutes from './routes/cater.routes.js';
import packagesRoutes from './routes/packages.routes.js';

const app = express();
app.use(cors());
app.use(express.json());

app.get('/health', (_req, res) => res.json({ ok: true }));

// Existing mounts
app.use('/api/auth', authRoutes);
app.use('/api/services', serviceRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/favorites', favoritesRoute);
app.use('/api/users', usersRoute);

// NEW mounts
app.use('/api/cater-applications', caterApplicationsRoutes); // public + /me (auth) submit
app.use('/api/admin', adminRoutes);                           // admin review (list/approve/reject)
app.use('/api/cater', caterRoutes);                           // caterer console (bookings/status)
app.use('/api', packagesRoutes);                              // /services/:serviceId/packages

export default app;
