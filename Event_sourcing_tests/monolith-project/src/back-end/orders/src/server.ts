import express, { Request, Response} from 'express';
import orderRoute from './routes/orderRoute';
import { databaseSetup, brokerConsumerConnect } from './controllers/orderController'

const app = express()
const PORT: number = 5050;

app.use(express.json());

app.get('/', (req: Request, res: Response) => {
    res.send('Debug message');
});

app.use('/api/orders', orderRoute);

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
