import { Router } from 'express';
import orders from '../controllers/orderController';

const router = Router();

router.get('/', orders.findAll);

router.post('/', orders.add);


export default router;