import express from 'express';
import { predictBunchingRisk } from '../controllers/modelController';

const router = express.Router();

router.post('/predict', predictBunchingRisk);

export default router;
