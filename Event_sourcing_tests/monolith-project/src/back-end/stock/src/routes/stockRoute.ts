import { Router } from 'express';
import stock from '../controllers/stockController';

const router = Router();

// Retrieve all products
router.get('/', stock.findAll);

// Add a new product
router.post('/add', stock.add);

// Update a product
router.put('/', stock.update);


export default router;
