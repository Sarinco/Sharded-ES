import { Router } from 'express';
import product from '../controllers/productController';

const router = Router();

// Retrieve all products
router.get('/', product.findAll);

// Add a new product
router.post('/add', product.add);

// Buy a product
router.post('/buy', product.buy);

// Update a product
router.put('/', product.update);


export default router;
