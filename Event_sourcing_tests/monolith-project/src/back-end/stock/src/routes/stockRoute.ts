import { Router } from 'express';
import stock from '@src/controllers/stockController';
import { verifyAdmin } from '@src/middleware/auth';

const router = Router();


// Increase the stock of a product
router.put('/increase/:id', verifyAdmin, stock.increaseStock);

// Decrease the stock of a product
router.put('/decrease/:id', stock.decreaseStock);

// Get the stock of a product
router.get('/:id', stock.getStock);

// Set the stock of a product
router.post('/set/:id', verifyAdmin, stock.setStock);


export default router;
