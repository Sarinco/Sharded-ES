import { Kafka, Producer } from 'kafkajs';

export class ProducerFactory {
    private producer: Producer

    constructor(clientId: string, brokers: string[]) {
        this.producer = new Kafka({
            clientId,
            brokers,
        }).producer();
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
