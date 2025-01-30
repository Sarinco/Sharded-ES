import { Router } from 'express';
import users from '../controllers/usersController';

const router = Router();

// Create a new user
router.post('/', users.add);

// Retrieve all users
router.get('/', users.getAll);

// Retrieve a single user with id
router.get('/:id', users.getById);

// Make a user an admin
router.put('/:id', users.update);

// Delete a user
router.delete('/:id', users.delete);


export default router;
