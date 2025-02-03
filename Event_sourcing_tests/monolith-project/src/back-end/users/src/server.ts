import express, { Request, Response } from 'express';
import usersRoutes from './routes/usersRoute';

const app = express();
const PORT: number = parseInt(process.env.PORT as string) || 5000;

// Middleware to parse JSON bodies
app.use(express.json());

app.get('/', (req: Request, res: Response) => {
    res.send('Hello World!');
});

// Use stock routes
app.use('/api/users', usersRoutes);

// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
