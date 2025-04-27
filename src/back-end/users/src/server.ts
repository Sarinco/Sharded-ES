import express, { Request, Response } from 'express';
// For module aliasing
require('module-alias/register');

import usersRoutes from '@src/routes/usersRoute';
import kafkaRoutes from '@src/routes/kafkaRoute';
import { consumerConnect, redisSetup } from '@src/controllers/usersController';
import { addAdminUser } from '@src/controllers/usersController';

const app = express();
const PORT: number = parseInt(process.env.PORT as string) || 5000;

// Middleware to parse JSON bodies
app.use(express.json());

app.get('/health', (_req: Request, res: Response) => {
    res.send('Server is healthy');
});

// Use users routes
app.use('/api/users', usersRoutes);

// Kafka routes
app.use('/kafka', kafkaRoutes);

// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

// Connect the consumer and redis
redisSetup()
    .catch(e => {
        console.error(`[users/redisSetup] ${e.message}`, e);
        return;
    }).then(() =>
        consumerConnect()
            .catch(e => console.error(`[users/consumer] ${e.message}`, e))
    ).then(() => {
        addAdminUser()
            .catch(e => console.error(`[users/addAdminUser] ${e.message}`, e));
    });

