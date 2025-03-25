import { Router } from 'express';

import users from '@src/controllers/usersController';
import { 
    verifyAdmin, 
    verifyUser,
    verifyUserOrAdmin
} from '@src/middleware/auth';

const router = Router();

// Create a new user
router.post('/register', users.register);

// Authenticate a user
router.post('/login', users.login);

// Retrieve all users
router.get('/', verifyAdmin, users.getAll);

// Retrieve a single user with id
router.get('/:email', verifyUserOrAdmin, users.getByEmail);

// Make a user an admin
router.put('/:email', verifyAdmin, users.update);

// Delete a user
router.delete('/:email', verifyUserOrAdmin, users.delete);


export default router;
