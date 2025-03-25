import { Kafka, EachMessagePayload } from 'kafkajs';
import { createClient, RedisClientType } from 'redis';

import { v4 as uuid } from 'uuid';
import Order from "../types/order";
import {
    OrderAddedEvent,
    GetAllOrderEvent
} from '@src/types/events/order-events';
import { ordersEventHandler } from "@src/custom-handlers/ordersEventHandler";
import { ProducerFactory } from '../handlers/kafkaHandler';
import { producer } from "@src/handlers/proxyHandler";

// create a client connected to your local kafka instance
const EVENT_ADDRESS = process.env.EVENT_ADDRESS || "localhost";
const EVENT_PORT = process.env.EVENT_PORT || "9092";
export const client = new Kafka({
    clientId: 'event-pipeline',
    brokers: [`${EVENT_ADDRESS}:${EVENT_PORT}`]
});
const EVENT_CLIENT_ID = process.env.EVENT_CLIENT_ID || "order-service";

// for redis
const DB_ADDRESS = process.env.DB_ADDRESS || "localhost";
const DB_PORT = "6379";

export const topicList = ['orders'];

const DEFAULT_REGION = process.env.REGION;

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

const consumer = client.consumer({ groupId: EVENT_CLIENT_ID });

export const brokerConsumerConnect = async () => {
    await consumer.connect()

    await Promise.all(topicList.map(topic => consumer.subscribe({ topic, fromBeginning: true })));

    await consumer.run({
        eachMessage: async ({ topic, partition, message }: EachMessagePayload) => {
            if (message.value == null) {
                console.log("Message is null");
                return;
            }
            switch (topic) {
                case 'orders':
                    const order: Order = JSON.parse(message.value.toString());
                    console.log("OrderEvent: ", order);
                    await ordersEventHandler(redis, order);
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
            const ask_proxy = req.query.ask_proxy;
            if (!ask_proxy) {
                console.log("Asking the proxy to get the stock");
                const event: GetAllOrderEvent = new GetAllOrderEvent(
                    req.originalUrl,
                    req.headers.authorization
                );
                producer.send(
                    topicList[0],
                    event.toJSON()
                ).then((result: any) => {
                    console.log("Result from proxy", result);
                    res.status(200).json(result);
                }).catch((error: any) => {
                    console.log("Error in findAll method: ", error);
                    res.status(500).send("Error in findAll method");
                });
                return;
            }

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
export { consumer };

export default orders;
