import { Kafka, EachMessagePayload } from 'kafkajs';
import { ProducerFactory } from '../handlers/kafkaHandler';
import { Cassandra } from '../handlers/cassandraHandler';
import { v4 as uuid } from 'uuid';
import { User } from '../types/user';


// Setup environment variables
const EVENT_ADDRESS = process.env.EVENT_ADDRESS || "localhost";
const EVENT_PORT = process.env.EVENT_PORT || "9092";

const client = new Kafka({
    clientId: 'event-pipeline',
    brokers: [`${EVENT_ADDRESS}:${EVENT_PORT}`],
});
const EVENT_CLIENT_ID = process.env.EVENT_CLIENT_ID || "users-service";

// For the Cassandra database
const DB_ADDRESS = process.env.DB_ADDRESS || "localhost";
const DB_PORT = "9042";
const KEYSPACE = process.env.DB_KEYSPACE || "users";



// CASSANDRA
const cassandra = new Cassandra(KEYSPACE, [`${DB_ADDRESS}:${DB_PORT}`]);
cassandra.connect();


// PRODUCER
const producer = new ProducerFactory(EVENT_CLIENT_ID, [`${EVENT_ADDRESS}:${EVENT_PORT}`]);
producer.start().then(() => {
    console.log("Producer started successfully");
}).catch((error: any) => {
    console.log("Error starting the producer: ", error);
});


// CONSUMER
const consumer = client.consumer({ groupId: 'users-group' });
const topics = ['users'];

const run = async () => {
    await consumer.connect()
    await Promise.all(topics.map(topic => consumer.subscribe({ topic, fromBeginning: true })));
    await consumer.run({
        eachMessage: async ({ topic, partition, message }: EachMessagePayload) => {
            if (message.value === null) {
                console.log("Message is null");
                return;
            }
            switch (topic) {
                default:
                    console.log("Unknown topic: ", topic);
                    break;
            }
        },
    });
}

run().catch(e => console.error(`[users/consumer] ${e.message}`, e))



// HTTP Controller
const users = {
    // Add a user
    add: async (req: any, res: any) => {
        res.status(200).send("User added successfully");
    },

    // Get all users
    getAll: async (req: any, res: any) => {
        res.status(200).send("Get all users");
    },

    // Get a user by id
    getById: async (req: any, res: any) => {
        res.status(200).send("Get user by id");
    },

    // Update a user
    update: async (req: any, res: any) => {
        res.status(200).send("Update user");
    },
    
    // Delete a user
    delete: async (req: any, res: any) => {
        res.status(200).send("Delete user");
    }
}


export default users;
