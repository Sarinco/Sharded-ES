import express, { Request, Response } from 'express';
// For module aliasing
require('module-alias/register');

import stockRoutes from '@src/routes/stockRoute';
import kafkaRoutes from '@src/routes/kafkaRoute';
import { consumerConnect, redisSetup } from '@src/controllers/stockController';

const app = express();
const PORT: number = parseInt(process.env.PORT as string);

// Middleware to parse JSON bodies
app.use(express.json());

app.get('/health', (_req: Request, res: Response) => {
    res.send('Server is healthy');
});

// Use stock routes
app.use('/api/stock', stockRoutes);


// Kafka routes
app.use('/kafka', kafkaRoutes);

// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});


// Connect the consumer and redis
redisSetup()
.catch(e => {
    console.error(`[stock/redisSetup] ${e.message}`, e);
    return;
}).then(() =>
    consumerConnect()
        .catch(e => console.error(`[stock/consumer] ${e.message}`, e))
);

