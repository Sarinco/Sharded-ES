const { Kafka, EachMessagePayload } = require('kafkajs');
import { v4 as uuid } from 'uuid';
import { Product } from "../types/product";
import { ProductAddedEvent, ProductBoughtEvent, ProductUpdatedEvent } from "../types/stock-events";
import { productEventHandler } from "../handlers/productEventHandler";

// Create a client connected to your local EventStoreDB instance
const DB_ADDRESS = process.env.DB_ADDRESS || "localhost";
const DB_PORT = process.env.DB_PORT || "9092";
const client = new Kafka({
    clientId: 'event-pipeline',
    brokers: [`${DB_ADDRESS}:${DB_PORT}`],
});


const producer = client.producer()
const consumer = client.consumer({ groupId: 'stock-group' });
consumer.connect();
consumer.subscribe({ topic: 'products', fromBeginning: true });

const localProducts: Product[] = [];
consumer.run({
    eachMessage: async ({ topic, partition, message }: typeof EachMessagePayload) => {
        const product: Product = JSON.parse(message.value.toString());
        console.log("Product: ", product);
        productEventHandler(localProducts, product);
    },
});

const stock = {
    // Retrieve all stocks
    findAll: async (req: any, res: any) => {
        try {
            const products: Product[] = [];
            console.log("Calling the findAll method");

            res.send(localProducts);
        } catch (error) {
            console.log("Error in findAll method: ", error);
            res.status(500).send
        }
    },

    // Add a new product
    add: async (req: any, res: any) => {
        try {
            console.log("Address used: ", `${DB_ADDRESS}:${DB_PORT}`);

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

            await producer.connect();
            await producer.send({
                topic: 'products',
                messages: [event.toJSON()]
            });

            res.send("Product added successfully");
        } catch (error) {
            console.log("Error in add method: ", error);
            res.status(500).send
        }
    },

    // Update a product
    update: async (req: any, res: any) => {
        try {
            console.log("req.body: ", req.body);
            console.log("Calling the update method with id: ", req.body.id, " and field: ", req.body.field, " and updateValue: ", req.body.updateValue);
            if (req.body.id === undefined || req.body.id === "") {
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
            // const event = jsonEvent<ProductUpdatedEvent>({
            //     type: "ProductUpdated",
            //     data: {
            //         id: req.body.id,
            //         field: req.body.field,
            //         updateValue: req.body.updateValue
            //     }
            // });


            res.send("Product updated successfully");
        } catch (error) {
            console.log("Error in update method: ", error);
            res.status(500).send

        }
    }
}

export default stock;
