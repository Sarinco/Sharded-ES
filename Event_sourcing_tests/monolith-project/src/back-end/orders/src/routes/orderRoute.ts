import { Router } from 'express';
import orders from '../controllers/orderController';

const router = Router();

router.get('/', (req, res) => {
    orders.findAll;
});

router.post('/', (req, res) => {
    orders.add;
});

router.put('/', (req, res) => {
    res.send("TODO");
});

export default router;