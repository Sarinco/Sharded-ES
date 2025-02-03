import { Kafka, EachMessagePayload } from 'kafkajs';
import { v4 as uuid } from 'uuid';
import { Product } from "../types/product";
import { ProductAddedEvent, ProductDeletedEvent, ProductUpdatedEvent } from "../types/events/stock-events";
import { productEventHandler } from "../custom-handlers/productEventHandler";
import { ProducerFactory } from "../handlers/kafkaHandler";
import { Cassandra } from '../handlers/cassandraHandler';
import { verifyJWT } from '../middleware/token';

// Setup environment variables
const EVENT_ADDRESS = process.env.EVENT_ADDRESS || "localhost";
const EVENT_PORT = process.env.EVENT_PORT || "9092";
const client = new Kafka({
    clientId: 'event-pipeline',
    brokers: [`${EVENT_ADDRESS}:${EVENT_PORT}`],
});
const EVENT_CLIENT_ID = process.env.EVENT_CLIENT_ID || "stock-service";

// For the Cassandra database
const DB_ADDRESS = process.env.DB_ADDRESS || "localhost";
const DB_PORT = "9042";
const KEYSPACE = process.env.DB_KEYSPACE || "stock";

const topic = ['products'];


// CASSANDRA
const cassandra = new Cassandra(KEYSPACE, [`${DB_ADDRESS}:${DB_PORT}`]);
cassandra.connect();


// ADMIN TOPIC CREATION
const setup = async () => {
    const admin = client.admin();
    await admin.connect();

    // Create the topics if they don't exist
    await admin.listTopics().then(async (topics) => {
        for (let i = 0; i < topic.length; i++) {
            if (!topics.includes(topic[i])) {
                console.log("Creating topic: ", topic[i]);
                await admin.createTopics({
                    topics: [{ topic: topic[i] }],
                });
            } else {
                console.log("Topic already exists: ", topic[i]);
            }
        }
    }).catch((error: any) => {
        console.log("Error in listTopics method: ", error);
    });
    await admin.disconnect();
}

// PRODUCER
const producer = new ProducerFactory(EVENT_CLIENT_ID, [`${EVENT_ADDRESS}:${EVENT_PORT}`]);
producer.start().then(() => {
    console.log("Producer started successfully");
}).catch((error: any) => {
    console.log("Error starting the producer: ", error);
});


// CONSUMER
const consumer = client.consumer({ groupId: 'stock-group' });



const run = async () => {
    await consumer.connect()
    await Promise.all(topic.map(topic => consumer.subscribe({ topic, fromBeginning: true })));
    // Small local equivalent of CQRS for the stock service
    await consumer.run({
        eachMessage: async ({ topic, partition, message }: EachMessagePayload) => {
            if (message.value === null) {
                console.log("Message is null");
                return;
            }
            switch (topic) {
                case 'products':
                    const product: Product = JSON.parse(message.value.toString());
                    console.log("ProductEvent: ", product);
                    productEventHandler(cassandra, product);
                    break;
                default:
                    console.log("Unknown topic: ", topic);
                    break;
            }
        },
    });
}

setup()
    .catch(e => {
        console.error(`[stock/admin] ${e.message}`, e);
        return;
    })
    .then(() => 
        run()
            .catch(e => console.error(`[stock/consumer] ${e.message}`, e))
    );

// HTTP
const stock = {
    // Retrieve all stocks
    findAll: async (req: any, res: any) => {
        try {
            // Get the products from the Cassandra database
            const query = `SELECT * FROM ${KEYSPACE}.product`;
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
            const token = req.headers.authorization;
            console.debug('Token:', token);

            if (!token) {
                throw new Error('No token provided');
            }

            const decoded = verifyJWT(token); TODO:

            if (decoded === "Invalid token") {
                return res.status(401).send("Invalid token");
            }

            const { role, email: addedBy, exp } = decoded as any;

            if (exp < Date.now().valueOf() / 1000) {
                return res.status(401).send("Token has expired");
            }

            if (role !== "admin") {
                return res.status(403).send("Unauthorized");
            }

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
                req.body.count,
                addedBy
            );

            producer.send(
                'products',
                event.toJSON()
            ).then(() => {
                console.log("Product added successfully by ", addedBy);
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
            const token = req.headers.authorization;
            console.debug('Token:', token);

            if (!token) {
                throw new Error('No token provided');
            }

            const decoded = verifyJWT(token); TODO:

            if (decoded === "Invalid token") {
                return res.status(401).send("Invalid token");
            }

            const { role, email: updatedBy, exp } = decoded as any;

            if (exp < Date.now().valueOf() / 1000) {
                return res.status(401).send("Token has expired");
            }

            if (role !== "admin") {
                return res.status(403).send("Unauthorized");
            }

            console.log("req.body: ", req.body);

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
                req.body.count,
                updatedBy
            );

            producer.send(
                'products',
                event.toJSON()
            ).then(() => {
                console.log("Product updated sent successfully");
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
            const token = req.headers.authorization;
            console.debug('Token:', token);

            if (!token) {
                throw new Error('No token provided');
            }

            const decoded = verifyJWT(token); TODO:

            if (decoded === "Invalid token") {
                return res.status(401).send("Invalid token");
            }

            const { role, email: deletedBy, exp } = decoded as any;

            if (exp < Date.now().valueOf() / 1000) {
                return res.status(401).send("Token has expired");
            }

            if (role !== "admin") {
                return res.status(403).send("Unauthorized");
            }

            console.log("Calling the delete method with id: ", req.params.id);
            if (req.params.id === undefined || req.params.id === "") {
                res.status(400).send("Invalid id");
                return;
            }

            const event: ProductDeletedEvent = new ProductDeletedEvent(req.params.id, deletedBy);

            producer.send(
                'products',
                event.toJSON()
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

export default stock;
