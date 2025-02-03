import { Kafka, EachMessagePayload } from 'kafkajs';
import { ProducerFactory } from './handlers/kafkaHandler';


// Setup environment variables
const EVENT_ADDRESS = process.env.EVENT_ADDRESS || "localhost";
const EVENT_PORT = process.env.EVENT_PORT || "9092";

const client = new Kafka({
    clientId: 'event-pipeline',
    brokers: [`${EVENT_ADDRESS}:${EVENT_PORT}`],
});
const EVENT_CLIENT_ID = process.env.EVENT_CLIENT_ID || "email-service";
const topic = ['emails'];


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
const consumer = client.consumer({ groupId: 'email-group' });

const run = async () => {
    await consumer.connect()
    await Promise.all(topic.map(top => consumer.subscribe({ topic: top, fromBeginning: true })));
    await consumer.run({
        eachMessage: async ({ topic, partition, message }: EachMessagePayload) => {
            if (message.value === null) {
                console.log("Message is null");
                return;
            }
            switch (topic) {
                case 'emails':
                    console.log("Email: ", message.value.toString());
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
        console.error(`[email/admin] ${e.message}`, e)
        return;
    })
    .then(() => 
        run()
            .catch(e => console.error(`[email/consumer] ${e.message}`, e))
    );


