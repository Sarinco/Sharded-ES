const { Kafka, EachMessagePayload } = require('kafkajs');
import { v4 as uuid } from 'uuid';
import Order from "../types/order";
import { OrderAddedEvent } from '../types/order-events'; 
import { ordersEventHandler } from "../custom-handlers/ordersEventHandler";
import { ProducerFactory } from '../handlers/kafkaHandler';
import { createClient, RedisClientType } from 'redis';
import { verifyJWT } from '../middleware/token';

// create a client connected to your local kafka instance
const EVENT_ADDRESS = process.env.EVENT_ADDRESS || "localhost";
const EVENT_PORT    = process.env.EVENT_PORT    || "9092";
const client        = new Kafka({
    clientId: 'event-pipeline',
    brokers:  [`${EVENT_ADDRESS}:${EVENT_PORT}`]
});
const EVENT_CLIENT_ID = process.env.EVENT_CLIENT_ID || "order-service";

// for redis
const DB_ADDRESS = process.env.DB_ADDRESS || "localhost";
const DB_PORT    = "6379";
const KEYSPACE   = process.env.KEYSPACE   || "orders";

const topic = 'orders';

const redisUrl = "redis://" + DB_ADDRESS + ":" + DB_PORT;
const redis: RedisClientType = createClient({
    url: redisUrl
});

//setup fct
export const databaseSetup = async () => {
    

    // REDIS
    await redis.on('error', (error: any) => {
        console.log("Error in Redis: ", error);
    }).connect().then(() => {
        console.log("Connected to Redis");
    }).catch((error: any) => {
        console.log("Error connecting to Redis: ", error);
    });
}

// const producer = client.producer()
const producer = new ProducerFactory(EVENT_CLIENT_ID, [`${EVENT_ADDRESS}:${EVENT_PORT}`]);
producer.start().then(() => {
    console.log("Producer started successfully");
}).catch((error: any) => {
    console.log("Error starting the producer: ", error);
});

const consumer = client.consumer({ groupId: 'orders-group' });

export const brokerConsumerConnect = async () => {
    await consumer.connect()
    await consumer.subscribe({ topic, fromBeginning: true })
    await consumer.run({
        eachMessage: async ({ topic, partition, message }: typeof EachMessagePayload) => {
            if (message.value == null ) {
                console.log("Message is null");
                return;
            }
            switch (topic) {
                case 'orders':
                    const order: Order = JSON.parse(message.value.toString());
                    console.log("OrderEvent: ", order);
                    ordersEventHandler(redis, order);
                    break;
                default:
                    console.log("Unknown topic: ", topic);
                    break;
            }
        },
    });
}


const orders = {
    // Retrieve all stocks
    findAll: async (req: any, res: any) => {
        try {
            const orders: Order[] = [];
            for await (const id of redis.scanIterator()) {
                const value = await redis.get(id);
                console.log("Value: ", value);
                if (value === null) {
                    console.log("Value is null");
                    continue;
                }
                const order = JSON.parse(value);
                orders.push(order);
            }

            res.status(200).send(orders);
        } catch (error) {
            console.log("Error in findAll method: ", error);
            res.status(500).send(error);
        }
    },

    // Add a new product
    add: async (req: any, res: any) => {
        try {
            // ## COMMENTED CODE FOR TOKEN VERIFICATION ## //

            //const token = req.headers.authorization;
            //console.debug('Token:', token);

            //if (!token) {
                //throw new Error('No token provided');
            //}

            //const decoded = verifyJWT(token);

            //if (decoded === "Invalid token") {
                //return res.status(401).send("Invalid token");
            //}

            //const { role, email: addedBy, exp } = decoded as any;

            //if (exp < Date.now().valueOf() / 1000) {
                //return res.status(401).send("Token has expired");
            //}

            //if (role !== "admin") {
                //return res.status(403).send("Unauthorized");
            //}

            const event: OrderAddedEvent = new OrderAddedEvent(
                uuid(),
                req.body.customer,
                req.body.location,
                req.body.product,
                req.body.count
            );

            producer.send(
                'orders',
                event.toJSON()
            ).then(() => {
            //    console.log("Order added successfully by ", addedBy);
                res.send("Order added successfully");
            }).catch((error: any) => {
                console.log("Error in add method: ", error);
                res.status(500).send(error);
            });
        } catch (error) {
            console.log("Error in add method: ", error);
            res.status(500).send(error);
        }
    },
}

export default orders;

