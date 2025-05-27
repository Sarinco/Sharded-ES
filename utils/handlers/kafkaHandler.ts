import { Kafka, Producer } from 'kafkajs';

export class ProducerFactory {
    private static instance: ProducerFactory;
    private producer: Producer

    private constructor(clientId: string) {
        const EVENT_HOST = process.env.EVENT_ADDRESS;
        const EVENT_PORT = process.env.EVENT_PORT;
        const KAFKA_ADDRESS = `${EVENT_HOST}:${EVENT_PORT}`;
        const brokers = [KAFKA_ADDRESS];

        if (!EVENT_HOST || !EVENT_PORT) {
            throw new Error("Environment variables EVENT_HOST and EVENT_PORT must be set");
        }

        console.log("Connecting to Kafka brokers: ", brokers);

        this.producer = new Kafka({
            clientId,
            brokers,
        }).producer();
    }

    public static getInstance(clientId: string): ProducerFactory {
        if (!ProducerFactory.instance) {
            console.log("Creating a new instance of ProducerFactory");
            ProducerFactory.instance = new ProducerFactory(clientId);
        }
        return ProducerFactory.instance;
    }

    public async start(): Promise<void> {
        try {
            await this.producer.connect()
        } catch (error) {
            console.log('Error connecting the producer: ', error)
        }
    }

    public async shutdown(): Promise<void> {
        await this.producer.disconnect()
    }

    public async send(topic: string, message: any): Promise<void> {
        console.log('Sending message: ', message, ' to topic: ', topic);
        await this.producer.send({
            topic,
            messages: [message],
        })        
    }
}
