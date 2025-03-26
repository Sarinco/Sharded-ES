import { Kafka, EachMessagePayload } from 'kafkajs';
import { createClient, RedisClientType } from 'redis';

// Custom imports
import { ProducerFactory } from '@src/handlers/kafkaHandler';
import { v4 as uuid } from 'uuid';
import { User } from '@src/types/user';
import {
    UserAddedEvent,
    UserFailedAuthenticationEvent,
    UserAuthenticatedEvent,
    UserDeletedEvent,
    UserUpdatedEvent,
    GetUserEvent,
    GetAllUserEvent,
} from '@src/types/events/users-events';
import { userEventHandler } from '@src/custom-handlers/usersEventHandler';
import { producer } from "@src/handlers/proxyHandler";

// Import the password middleware
import { generateSalt, hashPassword, verifyPassword } from '@src/middleware/password';
import { generateJWT, verifyJWT, generateServiceToken } from '@src/middleware/token';
import { verifyToken } from '@src/middleware/auth';


// Setup environment variables
const EVENT_ADDRESS = process.env.EVENT_ADDRESS || "localhost";
const EVENT_PORT = process.env.EVENT_PORT || "9092";

const client = new Kafka({
    clientId: 'event-pipeline',
    brokers: [`${EVENT_ADDRESS}:${EVENT_PORT}`],
});
const EVENT_CLIENT_ID = process.env.EVENT_CLIENT_ID || "users-service";

const SERVICE_TOKEN = generateServiceToken("users-service");

// For the database
const DB_ADDRESS = process.env.DB_ADDRESS;
const DB_PORT = "6379";

const topic = ['users'];


// REDIS
const redisUrl = "redis://" + DB_ADDRESS + ":" + DB_PORT;
const redis: RedisClientType = createClient({
    url: redisUrl,
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


const consumerConnect = async () => {
    await consumer.connect()
    await Promise.all(topic.map(top => consumer.subscribe({ topic: top, fromBeginning: true })));
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
                    await userEventHandler(redis, user);
                    break;
                default:
                    console.log("Unknown topic: ", topic);
                    break;
            }
        },
    });
}


// HTTP Controller
const users = {
    // Add a user
    register: async (req: any, res: any) => {
        const { email, password } = req.body;

        try {
            // Check if the user already exists
            // Get the user
            const event: GetUserEvent = new GetUserEvent(
                email,
                `/api/users/${email}`,
                req.headers.authorization
            );

            const response = await producer.send(
                topic[0],
                event.toJSON()
            );

            if (response.status !== 404) {
                console.log("User already exists");
                return res.status(409).send("User already exists");
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

            // Send an event to Kafka
            const userAddedEvent = new UserAddedEvent(user.email, user.hash, user.salt, user.role);
            producer.send("users", userAddedEvent.toJSON()).then(() => {
                console.log("User added event sent successfully");
                const token = generateJWT(user.email, user.role);

                res.setHeader('Authorization', token);
                res.status(201).send("User added successfully");
            }).catch((error: any) => {
                console.log("Error sending user added event: ", error);
            })

        } catch (error) {
            console.log("Error in login method: ", error);
            res.status(500).send("Error in login method");
        }
    },

    // Authenticate a user
    login: async (req: any, res: any) => {
        const { email, password } = req.body;

        try {
            // Get the user
            const event: GetUserEvent = new GetUserEvent(
                email,
                `/api/users/${email}`,
                req.headers.authorization
            );

            const response = await producer.send(
                topic[0],
                event.toJSON()
            ).catch((error: any) => {
                console.log("Error in get user by email method: ", error);
                res.status(500).send("Error in get user by email method");
            });

            if (!response || response.status == 404) {
                console.log("User not found");

                // Send an event to Kafka
                const userFailedAuthenticationEvent = new UserFailedAuthenticationEvent(email);
                producer.send("users", userFailedAuthenticationEvent.toJSON());

                return res.status(404).send("User not found");
            }

            console.log("User found: ", response);
            const user = await response.json();
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
        try {
            const ask_proxy = req.query.ask_proxy;
            if (!ask_proxy) {
                console.log("Asking the proxy to get the stock");
                const event: GetAllUserEvent = new GetAllUserEvent(
                    req.originalUrl,
                    SERVICE_TOKEN
                );
                console.log("Event: ", event);
                producer.send(
                    topic[0],
                    event.toJSON()
                ).then((result: any) => {
                    console.log("Result from proxy", result);
                    if (result.status !== 200) {
                        res.status(result.status).send(result.message);
                        return;
                    }
                    res.status(200).json(result);
                }).catch((error: any) => {
                    console.log("Error in get user by email method: ", error);
                    res.status(500).send("Error in get user by email method");
                });
                return;
            }

            // Get the users from the Cassandra database
            const users: User[] = [];
            for await (const email of redis.scanIterator()) {
                const response = await redis.get(email);
                if (!response) {
                    console.log("User not found");
                    return res.status(404).send("User not found");
                }
                const user = JSON.parse(response);
                users.push(user);
            }

            console.debug("Users: ", users);
            res.status(200).send(users);
        } catch (error) {
            console.debug("Error in findAll method: ", error);
            res.status(500).send("Error in findAll method");
        }

    },

    // Get a user by email
    getByEmail: async (req: any, res: any) => {
        try {
            const ask_proxy = req.query.ask_proxy;
            if (!ask_proxy) {
                console.log("Asking the proxy to get the stock");
                const event: GetUserEvent = new GetUserEvent(
                    req.params.email,
                    req.originalUrl,
                    req.headers.authorization
                );
                producer.send(
                    topic[0],
                    event.toJSON()
                ).then((result: any) => {
                    console.log("Result from proxy", result);
                    if (result.status !== 200) {
                        res.status(result.status).send(result.message);
                        return;
                    }
                    res.status(200).json(result);
                }).catch((error: any) => {
                    console.log("Error in get user by email method: ", error);
                    res.status(500).send("Error in get user by email method");
                });
                return;
            }

            console.debug(`Looking for user ${req.params.email}`)
            const response = await redis.get(req.params.email);
            if (!response) {
                console.log("User not found");
                return res.status(404).send("User not found");
            }

            const user = JSON.parse(response);
            console.debug("User: ", user);
            res.status(200).send(user);

        } catch (error) {
            console.log("Error in getById method: ", error);
            res.status(500).send("Error in getById method");
        }
    },

    // Update a user
    update: async (req: any, res: any) => {
        const { email: modifiedBy } = verifyJWT(req.headers.authorization) as any;

        try {
            // Get the user from the database
            const response = await redis.get(req.params.email);
            if (!response) {
                console.log("User not found");
                return res.status(404).send("User not found");
            }

            const user = JSON.parse(response);

            // Send an event to Kafka
            const userUpdatedEvent = new UserUpdatedEvent(
                req.params.email,
                user.hash,
                user.salt,
                user.role,
                modifiedBy
            );
            producer.send("users", userUpdatedEvent.toJSON()).then(() => {
                console.log("User updated event sent successfully");
                res.status(200).send("User updated successfully");
            }).catch((error: any) => {
                console.log("Error sending user updated event: ", error);
            });

        } catch (error) {
            console.log("Error in update method: ", error);
            res.status(500).send("Error in update method");
        }
    },

    // Delete a user
    delete: async (req: any, res: any) => {
        const { email: modifiedBy } = verifyJWT(req.headers.authorization) as any

        try {
            // Get the user from the database
            const response = await redis.get(req.params.email);
            if (!response) {
                console.log("User not found");
                return res.status(404).send("User not found");
            }

            // Send an event to Kafka
            const userDeletedEvent = new UserDeletedEvent(req.params.email, modifiedBy);
            producer.send("users", userDeletedEvent.toJSON()).then(() => {
                console.log("User deleted event sent successfully");
                res.status(200).send("User deleted successfully");
            }).catch((error: any) => {
                console.log("Error sending user deleted event: ", error);
            });

        } catch (error) {
            console.log("Error in delete method: ", error);
            res.status(500).send("Error in delete method");
        }
    }
}

// Add the first admin user
const addAdminUser = async () => {
    const email = "admin@test.be";
    const password = "admin";

    redis.get(email).then((response) => {
        if (response) {
            console.log("Admin user already exists");
            return;
        }

        // Hash the password
        const salt = generateSalt();
        hashPassword(password, salt).then((hash) => {
            const user: User = {
                email,
                hash,
                salt: salt.toString('hex'),
                role: "admin"
            };

            redis.set(email, JSON.stringify(user)).then(() => {
                console.log("Admin user added successfully");
            }).catch((error) => {
                console.log("Error adding admin user: ", error);
            });
        }).catch((error) => {
            console.log("Error hashing password: ", error);
        });
    }).catch((error) => {
        console.log("Error getting admin user: ", error);
    });
}

export { client, topic, consumer, producer, redis };
export { redisSetup, consumerConnect, addAdminUser };

export default users;
