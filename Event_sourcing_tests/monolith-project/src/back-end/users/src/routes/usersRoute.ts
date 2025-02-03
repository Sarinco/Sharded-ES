import { Router } from 'express';
import users from '../controllers/usersController';

const router = Router();

// Create a new user
router.post('/register', users.register);

// Authenticate a user
router.post('/login', users.login);

// Retrieve all users
router.get('/', users.getAll);

// Retrieve a single user with id
router.get('/:email', users.getByEmail);

// Make a user an admin
router.put('/:email', users.update);

// Delete a user
router.delete('/:email', users.delete);


export default router;
