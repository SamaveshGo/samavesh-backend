import express from 'express';
import { getRoutes, getRouteById, searchStops } from '../controllers/routesController';

const router = express.Router();

router.get('/', getRoutes);
router.get('/stops/search', searchStops);
router.get('/:id', getRouteById);

export default router;
