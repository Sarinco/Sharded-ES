import { Kafka, EachMessagePayload } from 'kafkajs';
import { v4 as uuid } from 'uuid';
import { createClient, RedisClientType } from 'redis';

// Custom imports
import { Product } from "@src/types/product";
import { productEventHandler } from "@src/custom-handlers/productEventHandler";
import { verifyJWT } from '@src/middleware/token';
import {
    ProductAddedEvent,
    ProductDeletedEvent,
    ProductUpdatedEvent
} from "@src/types/events/product-events";
import { ProducerFactory } from "@src/handlers/kafkaHandler";

// Setup environment variables
const EVENT_ADDRESS = process.env.EVENT_ADDRESS;
const EVENT_PORT = process.env.EVENT_PORT;
const client = new Kafka({
    clientId: 'event-pipeline',
    brokers: [`${EVENT_ADDRESS}:${EVENT_PORT}`],
});
const EVENT_CLIENT_ID = process.env.EVENT_CLIENT_ID || 'product-service';

const producer = ProducerFactory.getInstance(EVENT_CLIENT_ID);

// For the database
const DB_ADDRESS = process.env.DB_ADDRESS;
const DB_PORT = "6379";

const topic = ['products', 'orders'];


// REDIS 
const redisUrl = "redis://" + DB_ADDRESS + ":" + DB_PORT;
const redis: RedisClientType = createClient({
    url: redisUrl
});

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
                case 'products':
                    const product: Product = JSON.parse(message.value.toString());
                    console.log("ProductEvent: ", product);
                    await productEventHandler(redis, product).catch((error: any) => {
                        console.log("Error in productEventHandler: ", error);
                    });
                    break;
                default:
                    console.log("Unknown topic: ", topic);
                    break;
            }
        },
    });
}

// HTTP
const stock = {
    // Retrieve all stocks
    findAll: async (req: any, res: any) => {
        try {
            // Get the products from the Cassandra database
            const products: Product[] = [];
            for await (const id of redis.scanIterator()) {
                const value = await redis.get(id);
                console.log("Value: ", value);
                if (value === null) {
                    console.log("Value is null");
                    continue;
                }
                const product = JSON.parse(value);
                products.push(product);
            }

            res.status(200).send(products);

        } catch (error) {
            console.log("Error in findAll method: ", error);
            res.status(500).send(error);
        }
    },

    // Add a new product
    add: async (req: any, res: any) => {
        try {
            const { email: added_by } = verifyJWT(req.headers.authorization) as any;

            console.log(added_by);
            if (added_by == undefined) {
                res.status(400).send("Problem with token");
            }
            console.log(req.body);
            if (req.body.name === undefined || req.body.name === "") {
                res.status(400).send("Invalid name");
                return;
            }

            if (req.body.price === undefined || req.body.price === "") {
                res.status(400).send("Invalid price");
                return;
            }

            const event: ProductAddedEvent = new ProductAddedEvent(
                uuid(),
                req.body.name,
                req.body.price,
                req.body.description,
                req.body.image,
                req.body.category,
                added_by
            );

            producer.send(
                'products',
                event.toJSON(),
            ).then(() => {
                console.log("Product added successfully by ", added_by);
                let response = {
                    id: event.id,
                    name: event.name,
                    price: event.price,
                    description: event.description,
                    image: event.image,
                    category: event.category,
                    added_by: added_by
                }
                res.send(response);
            }).catch((error: any) => {
                console.log("Error in add method: ", error);
                res.status(500).send(error);
            });
        } catch (error) {
            console.log("Error in add method: ", error);
            res.status(500).send(error);
        }
    },

    // Update a product
    update: async (req: any, res: any) => {
        try {
            const { role, email: updatedBy, exp } = verifyJWT(req.headers.authorization) as any;

            if (req.params.id === undefined || req.params.id === "") {
                res.status(400).send("Invalid id");
                return;
            }

            const event: ProductUpdatedEvent = new ProductUpdatedEvent(
                req.params.id,
                req.body.name,
                req.body.price,
                req.body.description,
                req.body.image,
                req.body.category,
                updatedBy
            );

            producer.send(
                'products',
                event.toJSON(),
            ).then(() => {
                console.log("Product updated sent successfully");
                let response = {
                    id: event.id,
                    name: event.name,
                    price: event.price,
                    description: event.description,
                    image: event.image,
                    category: event.category,
                    updatedBy: updatedBy
                }
                res.send(response);
            }).catch((error: any) => {
                console.log("Error in update method: ", error);
                res.status(500).send(error);
            });

        } catch (error) {
            console.log("Error in update method: ", error);
            res.status(500).send(error);

        }
    },

    // Delete a product
    delete: async (req: any, res: any) => {
        try {
            const { role, email: deletedBy, exp } = verifyJWT(req.headers.authorization) as any;

            console.log("Calling the delete method with id: ", req.params.id);
            if (req.params.id === undefined || req.params.id === "") {
                res.status(400).send("Invalid id");
                return;
            }

            const event: ProductDeletedEvent = new ProductDeletedEvent(req.params.id, deletedBy);

            producer.send(
                'products',
                event.toJSON(),
            ).then(() => {
                console.log("Product deleted sent successfully");
                res.send("Product deleted successfully");
            }).catch((error: any) => {
                console.log("Error in delete method: ", error);
                res.status(500).send(error);
            });

        } catch (error) {
            console.log("Error in delete method: ", error);
            res.status(500).send(error);
        }
    }
}

export { client, topic, consumer, producer, redis };
export { redisSetup, consumerConnect };

export default stock;
