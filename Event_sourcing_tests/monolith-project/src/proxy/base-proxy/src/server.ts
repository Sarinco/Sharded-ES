import express, { Request, Response } from 'express';
// For module aliasing
require('module-alias/register');

// Custom imports
import { ProducerFactory } from '@src/handlers/kafkaHandler';


const EVENT_ADDRESS = process.env.EVENT_ADDRESS;
const EVENT_PORT = process.env.EVENT_PORT;
const EVENT_CLIENT_ID = process.env.EVENT_CLIENT_ID;

if (!EVENT_ADDRESS || !EVENT_PORT || !EVENT_CLIENT_ID) {
    console.log('Please provide the event address, port and client id');
    process.exit(1);
}

// PRODUCER
const producer = new ProducerFactory(EVENT_CLIENT_ID, [`${EVENT_ADDRESS}:${EVENT_PORT}`]);
producer.start().then(() => {
    console.log("Producer started successfully");
}).catch((error: any) => {
    console.log("Error starting the producer: ", error);
});

const app = express();
const PORT: number = parseInt(process.env.PORT as string);

// Middleware to parse JSON bodies
app.use(express.json());

// For health check
app.get('/', (req: Request, res: Response) => {
    res.status(200).send('Producer is running');
});

// Logging all the requests made to the server
app.post('/', (req: Request, res: Response) => {
    const body = req.body;
    const { topic, region, message } = body;

    console.log('Received message for this region: ', region);
    console.log('Message: ', message);
    console.log('Forwarding message to the broker');

    producer.send(topic, message).then(() => {
        console.log('Message forwarded');
        res.status(200).send('Message forwarded');
    }).catch((error: any) => {
        console.log('Error forwarding the message: ', error);
        res.status(500).send('Error forwarding the message');
    });

});


// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
