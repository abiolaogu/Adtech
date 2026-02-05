import { Router } from 'express';
import adtechRoutes from './adtech';
import martechRoutes from './martech';
import inventoryRoutes from './inventory';
import analyticsRoutes from './analytics';
import authRoutes from './auth';
import reportsRoutes from './reports';

const router = Router();

// API Routes
router.use('/auth', authRoutes);
router.use('/adtech', adtechRoutes);
router.use('/martech', martechRoutes);
router.use('/inventory', inventoryRoutes);
router.use('/analytics', analyticsRoutes);
router.use('/reports', reportsRoutes);

// Ad serving and tracking (no auth required for performance)
router.use('/serve', adtechRoutes);
router.use('/track', adtechRoutes);

export default router;
