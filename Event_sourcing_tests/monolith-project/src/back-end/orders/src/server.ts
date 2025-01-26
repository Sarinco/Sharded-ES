import express, { Request, Response} from 'express';
import orderRoute from './routes/orderRoute';

const app = express()
const PORT: number = 5050;

app.use(express.json());

app.get('/', (req: Request, res: Response) => {
    res.send('Hello World!');
});

app.use('/api/orders', orderRoute);

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});