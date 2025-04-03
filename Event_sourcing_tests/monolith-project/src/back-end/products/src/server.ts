import express, { Request, Response } from 'express';
// For module aliasing
require('module-alias/register');

import productsRoutes from '@src/routes/productsRoute';
import kafkaRoutes from '@src/routes/kafkaRoute';
import { consumerConnect, redisSetup } from '@src/controllers/productsController';

const app = express();
const PORT: number = parseInt(process.env.PORT as string);

// Middleware to parse JSON bodies
app.use(express.json());

app.get('/health', (_req: Request, res: Response) => {
    res.send('Server is healthy');
});

// Use products routes
app.use('/api/products', productsRoutes);


// Kafka routes
app.use('/kafka', kafkaRoutes);

// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});


// Connect the consumer and redis
redisSetup()
.catch(e => {
    console.error(`[products/redisSetup] ${e.message}`, e);
    return;
}).then(() =>
    consumerConnect()
        .catch(e => console.error(`[products/consumer] ${e.message}`, e))
);

