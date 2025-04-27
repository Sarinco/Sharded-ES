import { Router } from 'express';
import stock from '@src/controllers/productsController';
import { verifyAdmin } from '@src/middleware/auth';

const router = Router();

// Retrieve all products
router.get('/', stock.findAll);

// Add a new product
router.post('/', verifyAdmin, stock.add);

// Update a product
router.put('/:id', verifyAdmin, stock.update);

// Delete a product
router.delete('/:id', verifyAdmin, stock.delete);


export default router;
