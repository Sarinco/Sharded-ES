import { Kafka, EachMessagePayload } from 'kafkajs';
import { createClient, RedisClientType } from 'redis';

// Custom imports
import { stockEventHandler } from "@src/custom-handlers/stockEventHandler";
import { orderEventHandler } from "@src/custom-handlers/orderEventHandler";
import {
    IncreaseStockEvent,
    DecreaseStockEvent,
    UpdateStockEvent,
} from "@src/types/events/stock-event";
import { ProducerFactory } from "@src/handlers/kafkaHandler";
import { productEventHandler } from '@src/custom-handlers/productEventHandler';

// Setup environment variables
const EVENT_ADDRESS = process.env.EVENT_ADDRESS;
const EVENT_PORT = process.env.EVENT_PORT;
console.debug("EVENT_ADDRESS: ", EVENT_ADDRESS);
console.debug("EVENT_PORT: ", EVENT_PORT);
const client = new Kafka({
    clientId: 'event-pipeline',
    brokers: [`${EVENT_ADDRESS}:${EVENT_PORT}`],
});
const EVENT_CLIENT_ID = process.env.EVENT_CLIENT_ID || 'stock-service';


// Producer
const producer = ProducerFactory.getInstance(EVENT_CLIENT_ID);
producer.start();

// For the database
const DB_ADDRESS = process.env.DB_ADDRESS;
const DB_PORT = "6379";

const topic = ['stock', 'orders', 'products'];


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
                case 'stock':
                    const stockEvent = JSON.parse(message.value.toString());
                    console.log("Stock event : ", stockEvent);
                    await stockEventHandler(redis, stockEvent);
                    break;

                case 'orders':
                    const orderEvent = JSON.parse(message.value.toString());
                    console.log("Order event : ", orderEvent);
                    await orderEventHandler(redis, orderEvent);
                    break;

                case 'products':
                    const productEvent = JSON.parse(message.value.toString());
                    console.log("Product event : ", productEvent);
                    await productEventHandler(redis, productEvent);
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
    // Increase the stock of a product
    increaseStock: async (req: any, res: any) => {
        const { count, warehouse } = req.body;
        const id = req.params.id;
        if (!id || !count || !warehouse) {
            res.status(400).send("Bad request");
            return;
        }

        const event: IncreaseStockEvent = new IncreaseStockEvent(id, count, warehouse);

        producer.send(
            'stock',
            event.toJSON()
        ).then(() => {
            console.log("Stock increase event sent");
            res.status(200).send("Stock increase event sent");
        }).catch((error: any) => {
            console.log("Error in sending stock increase event: ", error);
            res.status(500).send("Error in sending stock increase event");
        });
    },

    // Decrease the stock of a product
    decreaseStock: async (req: any, res: any) => {
        const { count, warehouse } = req.body;
        const id = req.params.id;

        if (!id || !count || !warehouse) {
            res.status(400).send("Bad request");
            return;
        }

        const event: DecreaseStockEvent = new DecreaseStockEvent(id, count, warehouse);

        producer.send(
            'stock',
            event.toJSON()
        ).then(() => {
            console.log("Stock decrease event sent");
            res.status(200).send("Stock decrease event sent");
        }).catch((error: any) => {
            console.log("Error in sending stock decrease event: ", error);
            res.status(500).send("Error in sending stock decrease event");
        });
    },

    // Get the stock of a product
    getStock: async (req: any, res: any) => {
        // Check if the request need to get forwarded to the proxy
        const warehouses = req.query.warehouse;
        const id = req.params.id;
        if (!id) {
            res.status(400).send("Bad request");
            return;
        }

        let stock_id;
        let stocks: any;
        if (!warehouses) {
            // Get all the warehouses where the product is stored
            const warehouses = await redis.lRange(id, 0, -1);
            console.log("Warehouses: ", warehouses);
            console.log("ID: ", id);
            stocks = [];
            if (warehouses.length === 0) {
                res.status(200).send(stocks);
                return;
            }
            for (const warehouse of warehouses) {
                stock_id = id + ":" + warehouse;
                let stock_entry = await redis.hGet(`${id}:${warehouse}`, 'stock');
                console.log("Stock entry: ", stock_entry);
                stocks.push({
                    warehouse: warehouse,
                    stock: stock_entry
                });
            }
            res.status(200).send(stocks);
            return;
        } else {
            // Get all the warehouses where the product is stored
            let warehouses_list = warehouses.split(",");
            stocks = [];
            for (const warehouse of warehouses_list) {
                console.log(`Getting stock for product ${id} in warehouse ${warehouse}`);
                stock_id = id + ":" + warehouse;
                let stock = await redis.hGet(stock_id, 'stock');
                console.log("Stock: ", stock);
                if (stocks === null) {
                    stock = "0";
                }
                stocks.push({
                    warehouse: warehouse,
                    stock: stock
                });
            }
            res.status(200).send(stocks);
            return;
        }
    },

    getAllStock: async (req: any, res: any) => {
        const warehouses = req.query.warehouse;
        const stocks: any = [];
        console.log('Getting all the stock in local area');
        for await (const id of redis.scanIterator()) {
            // Check if the key is an list or a hash
            const type = await redis.type(id);
            if (type === 'list') {
                let stock = [];
                const warehouses = await redis.lRange(id, 0, -1);
                for (const warehouse of warehouses) {
                    const stock_id = id + ":" + warehouse;
                    const stock_entry = await redis.hGet(stock_id, 'stock');
                    stock.push({
                        warehouse: warehouse,
                        stock: stock_entry
                    });
                }
                stocks.push({
                    id: id,
                    stock: stock
                });
            }
        }
        res.status(200).send(stocks);
    },

    // Set the stock of a product
    setStock: async (req: any, res: any) => {
        const { count, warehouse } = req.body;
        const id = req.params.id;
        if (!id || !count || !warehouse) {
            res.status(400).send("Bad request");
            return;
        }

        const event: UpdateStockEvent = new UpdateStockEvent(id, count, warehouse);

        producer.send(
            'stock',
            event.toJSON()
        ).then(() => {
            console.log("Stock update event sent");
            res.status(200).send("Stock update event sent");
        }).catch((error: any) => {
            console.log("Error in sending stock update event: ", error);
            res.status(500).send("Error in sending stock update event");
        });
    },

    deleteStock: async (req: any, res: any) => {
        const { warehouse } = req.body;
        const id = req.params.id;
        if (!id) {
            res.status(400).send("Bad request");
            return;
        }

        const event: UpdateStockEvent = new UpdateStockEvent(id, 0, warehouse);

        producer.send(
            'stock',
            event.toJSON()
        ).then(() => {
            console.log("Stock delete event sent");
            res.status(200).send("Stock delete event sent");
        }).catch((error: any) => {
            console.log("Error in sending stock delete event: ", error);
            res.status(500).send("Error in sending stock delete event");
        });
    }
}

export { client, topic, consumer, producer, redis };
export { redisSetup, consumerConnect };

export default stock;
