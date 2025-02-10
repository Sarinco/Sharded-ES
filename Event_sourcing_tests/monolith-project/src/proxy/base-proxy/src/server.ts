import express, { Request, Response } from 'express';
// For module aliasing
require('module-alias/register');


const app = express();
const PORT: number = parseInt(process.env.PORT as string);

// Middleware to parse JSON bodies
app.use(express.json());


// Logging all the requests made to the server
app.get('/', (req: Request, res: Response) => {
    console.log(req.body);
    res.send('Hello World!');
});

app.post('/', (req: Request, res: Response) => {
    console.log(req.body);
    res.send('Hello World!');
});


// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
