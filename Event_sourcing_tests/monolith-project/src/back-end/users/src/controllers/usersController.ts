import { Kafka, EachMessagePayload } from 'kafkajs';
import { ProducerFactory } from '../handlers/kafkaHandler';
import { Cassandra } from '../handlers/cassandraHandler';
import { v4 as uuid } from 'uuid';
import { User } from '../types/user';
import { 
    UserAddedEvent, 
    UserFailedAuthenticationEvent,
    UserAuthenticatedEvent,
} from '../types/events/users-events';

// Import the password middleware
import { generateSalt, hashPassword, verifyPassword } from '../middleware/password';
import { generateJWT, verifyJWT } from '../middleware/token';


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
                case 'users':
                    const user: User = JSON.parse(message.value.toString());
                    console.log("UserEvent: ", user);
                    break;
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
    register: async (req: any, res: any) => {
        const { email, password } = req.body;

        try {
            // Check if the user already exists
            let query = `SELECT * FROM ${KEYSPACE}.user WHERE email = ?`;
            const result = await cassandra.client.execute(query, [email], { prepare: true });

            if (result.rows.length > 0) {
                console.log("User already exists");
                return res.status(409).send("User already exists"); // Return here
            }

            // Hash the password
            const salt = generateSalt();
            const hash = await hashPassword(password, salt);

            // Create a new user
            const user: User = {
                email,
                hash,
                salt: salt.toString('hex'),
                role: "user"
            };

            // Add the user to the database
            query = `INSERT INTO ${KEYSPACE}.user (email, hash, salt, role) VALUES (?, ?, ?, ?)`;
            await cassandra.client.execute(query, [user.email, user.hash, user.salt, user.role], { prepare: true });

            console.log("User added successfully in the Database");
            res.status(201).send("User added successfully");

            // Send an event to Kafka
            const userAddedEvent = new UserAddedEvent(user.email, user.hash, user.salt, user.role);
            producer.send("users", userAddedEvent.toJSON());
        } catch (error) {
            console.log("Error in login method: ", error);
            res.status(500).send("Error in login method");
        }
    },

    // Authenticate a user
    login: async (req: any, res: any) => {
        const { email, password } = req.body;

        try {
            // Get the user from the database
            const query = `SELECT * FROM ${KEYSPACE}.user WHERE email = ?`;
            const result = await cassandra.client.execute(query, [email], { prepare: true });

            if (result.rows.length === 0) {
                console.log("User not found");

                // Send an event to Kafka
                const userFailedAuthenticationEvent = new UserFailedAuthenticationEvent(email);
                producer.send("users", userFailedAuthenticationEvent.toJSON());

                return res.status(404).send("User not found");
            }

            const user = result.rows[0];
            const storedHash = user.hash;
            const storedSalt = user.salt;

            // Verify the password
            const valid = await verifyPassword(password, storedSalt, storedHash);

            if (valid) {
                console.log("User authenticated successfully");
                
                // Generate a JWT token
                const token = generateJWT(email, user.role);
                res.setHeader('Authorization', token);
                
                res.status(200).send("User authenticated successfully");

                // Send an event to Kafka
                const userAuthenticatedEvent = new UserAuthenticatedEvent(email);
                producer.send("users", userAuthenticatedEvent.toJSON());

            } else {
                console.log("Invalid password");
                res.status(401).send("Invalid password");

                // Send an event to Kafka
                const userFailedAuthenticationEvent = new UserFailedAuthenticationEvent(email);
                producer.send("users", userFailedAuthenticationEvent.toJSON());

            }
        } catch (error) {
            console.log("Error in login method: ", error);

            // Send an event to Kafka
            const userFailedAuthenticationEvent = new UserFailedAuthenticationEvent(email);
            producer.send("users", userFailedAuthenticationEvent.toJSON());

            res.status(500).send("Error in login method");
        }
    },

    // Get all users
    getAll: async (req: any, res: any) => {
        const token = req.headers.authorization;
        const decoded = verifyJWT(token);

        if (decoded === "Invalid token") {
            return res.status(401).send("Invalid token");
        }

        const { role, exp } = decoded as any; 

        if (exp < Date.now().valueOf() / 1000) {
            return res.status(401).send("Token has expired");
        }

        if (role !== "admin") {
            return res.status(403).send("Unauthorized");
        }

        try {
            // Get the users from the Cassandra database
            const query = `SELECT * FROM ${KEYSPACE}.user`;
            const result = await cassandra.client.execute(query);
            console.debug("Result: ", result.rows);
            result.rows.forEach(row => {
                console.log(row);
            });

            res.send(result.rows);
        } catch (error) {
            console.debug("Error in findAll method: ", error);
            res.status(500).send("Error in findAll method");
        }

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
