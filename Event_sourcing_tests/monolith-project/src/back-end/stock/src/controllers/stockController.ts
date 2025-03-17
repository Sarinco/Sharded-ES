import { Kafka, EachMessagePayload } from 'kafkajs';
import { createClient, RedisClientType } from 'redis';

// Custom imports
import { stockEventHandler } from "@src/custom-handlers/stockEventHandler";

// Setup environment variables
const EVENT_ADDRESS = process.env.EVENT_ADDRESS;
const EVENT_PORT = process.env.EVENT_PORT;
const client = new Kafka({
    clientId: 'event-pipeline',
    brokers: [`${EVENT_ADDRESS}:${EVENT_PORT}`],
});
const EVENT_CLIENT_ID = process.env.EVENT_CLIENT_ID || 'stock-service';

const PROXY_ADDRESS = process.env.PROXY_ADDRESS;
const PROXY_PORT = process.env.PROXY_PORT;
const PROXY = `http://${PROXY_ADDRESS}:${PROXY_PORT}/`;

// For the database
const DB_ADDRESS = process.env.DB_ADDRESS;
const DB_PORT = "6379";

const topic = ['stock', 'orders'];


// REDIS 
const redisUrl = "redis://" + DB_ADDRESS + ":" + DB_PORT;
const redis: RedisClientType = createClient({
    url: redisUrl
});


// PRODUCER
const producer = {
    send: async (topic: string, message: any) => {
        const body = {
            topic,
            message
        }

        const result = await fetch(PROXY, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(body),
        })

        if (result.status !== 200) {
            console.debug(result);
            throw new Error('Error forwarding the message');
        }
    }
}

// CONSUMER
const consumer = client.consumer({
    groupId: EVENT_CLIENT_ID,
});

// SETUP
const redisSetup = async () => {
    // REDIS
    await redis.on('error', (error: any) => {
        console.log("Error in Redis: ", error);
    }).connect().then(() => {
        console.log("Connected to Redis");
    }).catch((error: any) => {
        console.log("Error connecting to Redis: ", error);
    });
}


// INFO: ONLY FOR CONSUMER CONNECT
const consumerConnect = async () => {
    await consumer.connect().then(() => {
        console.log("Consumer connected successfully");
    }).catch((error: any) => {
        console.log("Error in connect method: ", error);
    });

    await Promise.all(topic.map(topic => consumer.subscribe({ topic, fromBeginning: true })));
    // Small local equivalent of CQRS for the stock service
    await consumer.run({
        eachMessage: async ({ topic, message }: EachMessagePayload) => {
            if (message.value === null) {
                console.log("Message is null");
                return;
            }
            switch (topic) {
                case 'stock':
                    const stockEvent = JSON.parse(message.value.toString());
                    console.log("Stock event : ", stockEvent);
                    await stockEventHandler(redis, stockEvent);
                    break;
                // TODO: MOVE THIS TO STOCK SERVICE
                // case 'orders':
                //     const orderEvent = JSON.parse(message.value.toString());
                //     console.log("Order event : ", orderEvent);
                //     await orderEventHandler(redis, orderEvent);
                //     break;

                default:
                    console.log("Unknown topic: ", topic);
                    break;
            }
        },
    });
}

// HTTP
const stock = {
    // Increase the stock of a product
    increaseStock: async (req: any, res: any) => {
        res.status(501).send("Not implemented");
    },

    // Decrease the stock of a product
    decreaseStock: async (req: any, res: any) => {
        res.status(501).send("Not implemented");
    },

    // Get the stock of a product
    getStock: async (req: any, res: any) => {
        res.status(501).send("Not implemented");
    },

    // Set the stock of a product
    setStock: async (req: any, res: any) => {
        res.status(501).send("Not implemented");
    }
}

export { client, topic, consumer, producer, redis };
export { redisSetup, consumerConnect };

export default stock;
