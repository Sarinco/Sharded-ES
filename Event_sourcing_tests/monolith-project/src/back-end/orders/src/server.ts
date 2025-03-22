import express, { Request, Response} from 'express';
// For module aliasing
require('module-alias/register');

import orderRoute from '@src/routes/orderRoute';
import kafkaRoutes from '@src/routes/kafkaRoute';
import { databaseSetup, brokerConsumerConnect } from '@src/controllers/orderController'

const app = express()
console.log("PORT: ", process.env.PORT);
const PORT: number = parseInt(process.env.PORT as string);

app.use(express.json());

app.get('/', (req: Request, res: Response) => {
    res.send('Debug message');
});

app.use('/api/orders', orderRoute);

app.use('/kafka', kafkaRoutes);

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

databaseSetup()
    .catch(e => {
        console.error(`[order/databaseSetup] ${e.message}`, e)
        return;
    })
    .then(() => 
        brokerConsumerConnect()
            .catch(e => console.error(`[order/consumer] ${e.message}`, e))
    )
