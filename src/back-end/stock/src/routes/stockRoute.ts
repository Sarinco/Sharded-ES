import { Router } from 'express';
import stock from '@src/controllers/stockController';
import { verifyAdmin } from '@src/middleware/auth';

const router = Router();


// Increase the stock of a product
router.put('/:id/increase', verifyAdmin, stock.increaseStock);

// Decrease the stock of a product
router.put('/:id/decrease', stock.decreaseStock);

// Get the stock of a product
router.get('/:id', stock.getStock);

// Get all stocks
router.get('/', stock.getAllStock);

// Set the stock of a product
router.put('/:id', verifyAdmin, stock.setStock);

// Delete the stock of a product
router.delete('/:id', verifyAdmin, stock.deleteStock);

export default router;
