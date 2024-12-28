import { Router } from 'express';
import stock from '../controllers/stockController';

const router = Router();

// Retrieve all products
router.get('/', stock.findAll);

// Add a new product
router.post('/add', stock.add);

// Update a product
router.put('/:id', stock.update);

// Delete a product
router.delete('/:id', stock.delete);


export default router;
