const { Kafka, EachMessagePayload } = require('kafkajs');
import { v4 as uuid } from 'uuid';
import { Product } from "../types/product";
import { ProductAddedEvent, ProductDeletedEvent, ProductUpdatedEvent } from "../types/stock-events";
import { productEventHandler } from "../handlers/productEventHandler";
import { ProducerFactory } from "./producerFactory";
import { Cassandra } from './cassandra';

// Create a client connected to your local EventStoreDB instance
const DB_ADDRESS = process.env.DB_ADDRESS || "localhost";
const DB_PORT = process.env.DB_PORT || "9092";
const client = new Kafka({
    clientId: 'event-pipeline',
    brokers: [`${DB_ADDRESS}:${DB_PORT}`],
});


// Connect to the Cassandra database
const cassandra = new Cassandra();
cassandra.connect();

// const producer = client.producer()
const producer = new ProducerFactory('event-pipeline', [`${DB_ADDRESS}:${DB_PORT}`]);
producer.start().then(() => {
    console.log("Producer started successfully");
}).catch((error: any) => {
    console.log("Error starting the producer: ", error);
});

const consumer = client.consumer({ groupId: 'stock-group' });
const topic = 'products';
const localProducts: Product[] = [];

const run = async () => {
    await consumer.connect()
    await consumer.subscribe({ topic, fromBeginning: true })
    // Small local equivalent of CQRS for the stock service
    await consumer.run({
        eachMessage: async ({ topic, partition, message }: typeof EachMessagePayload) => {
            const product: Product = JSON.parse(message.value.toString());
            console.log("ProductEvent: ", product);
            productEventHandler(localProducts, product);
        },
    });
}

run().catch(e => console.error(`[stock/consumer] ${e.message}`, e))


const stock = {
    // Retrieve all stocks
    findAll: async (req: any, res: any) => {
        try {
            res.send(localProducts);
        } catch (error) {
            console.log("Error in findAll method: ", error);
            res.status(500).send(error);
        }
    },

    // Add a new product
    add: async (req: any, res: any) => {
        try {
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
                req.body.count
            );

            producer.send(
                'products',
                event.toJSON()
            ).then(() => {
                console.log("Product added successfully");
                res.send("Product added successfully");
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
            console.log("req.body: ", req.body);
            console.log("Calling the update method with id: ", req.param.id, " and field: ", req.body.field, " and updateValue: ", req.body.updateValue);
            if (req.param.id === undefined || req.param.id === "") {
                res.status(400).send("Invalid id");
                return;
            }
            if (req.body.field === undefined || req.body.field === "") {
                res.status(400).send("Invalid field");
                return;
            }
            if (req.body.updateValue === undefined || req.body.updateValue === "") {
                res.status(400).send("Invalid updateValue");
                return;
            }

            const event: ProductUpdatedEvent = new ProductUpdatedEvent(
                req.param.id,
                req.body.field,
                req.body.updateValue
            )

            producer.send(
                'products',
                event.toJSON()
            ).then(() => {
                console.log("Product updated successfully");
                res.send("Product updated successfully");
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
            console.log("Calling the delete method with id: ", req.params.id);
            if (req.params.id === undefined || req.params.id === "") {
                res.status(400).send("Invalid id");
                return;
            }

            const event: ProductDeletedEvent = new ProductDeletedEvent(req.params.id);

            producer.send(
                'products',
                event.toJSON()
            ).then(() => {
                console.log("Product deleted successfully");
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

export default stock;
