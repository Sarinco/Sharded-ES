const { Kafka, EachMessagePayload } = require('kafkajs');
import { v4 as uuid } from 'uuid';
import Order from "../types/order";
import { OrderAddedEvent } from '../types/order-events'; 
import { ordersEventHandler } from "../handlers/ordersEventHandler";
import { ProducerFactory } from '../handlers/kafkaHandler';
import { Cassandra } from '../handlers/cassandraHandler';

// create a client connected to your local kafka instance
const EVENT_ADDRESS = process.env.EVENT_ADDRESS || "localhost";
const EVENT_PORT    = process.env.EVENT_PORT    || "9092";
const client        = new Kafka({
    clientId: 'event-pipeline',
    brokers:  [`${EVENT_ADDRESS}:${EVENT_PORT}`]
});
const EVENT_CLIENT_ID = process.env.EVENT_CLIENT_ID || "order-service";

// for cassandra
const DB_ADDRESS = process.env.DB_ADDRESS || "localhost";
const DB_PORT    = "9042";
const KEYSPACE   = process.env.KEYSPACE   || "orders";

// Connect to the Cassandra database
console.log(DB_ADDRESS, DB_PORT);
const cassandra = new Cassandra(KEYSPACE, [`${DB_ADDRESS}:${DB_PORT}`]);
cassandra.connect();


// const producer = client.producer()
const producer = new ProducerFactory(EVENT_CLIENT_ID, [`${EVENT_ADDRESS}:${EVENT_PORT}`]);
producer.start().then(() => {
    console.log("Producer started successfully");
}).catch((error: any) => {
    console.log("Error starting the producer: ", error);
});

const consumer = client.consumer({ groupId: 'orders-group' });
const topic = 'orders';

const run = async () => {
    await consumer.connect()
    await consumer.subscribe({ topic, fromBeginning: true })
    // Small local equivalent of CQRS for the stock service
    await consumer.run({
        eachMessage: async ({ topic, partition, message }: typeof EachMessagePayload) => {
            const order: Order = JSON.parse(message.value.toString());
            console.log("ProductEvent: ", order);
            ordersEventHandler(cassandra, order);
        },
    });
}

run().catch(e => console.error(`[stock/consumer] ${e.message}`, e))


const orders = {
    // Retrieve all stocks
    findAll: async (req: any, res: any) => {
        try {
            // Get the products from the Cassandra database
            const query = `SELECT * FROM ${KEYSPACE}.entry`;
            const result = await cassandra.client.execute(query);
            console.log("Result: ", result.rows);
            result.rows.forEach(row => {
                console.log(row);
            });

            res.send(result.rows);
        } catch (error) {
            console.log("Error in findAll method: ", error);
            res.status(500).send(error);
        }
    },

    // Add a new product
    add: async (req: any, res: any) => {
        try {
            if (req.body.customer === undefined || req.body.customer === "") {
                res.status(400).send("Invalid customer");
                return;
            }

            if (req.body.count === undefined || req.body.count === "") {
                res.status(400).send("Invalid quantity");
                return;
            }

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
                console.log("Order added successfully");
                res.send("Order added successfully");
            }).catch((error: any) => {
                console.log("Error in add method: ", error);
                res.status(500).send(error);
            });
        } catch (error) {
            console.log("Error in add method: ", error);
            res.status(500).send(error);
        }
    }
}

export default orders;

