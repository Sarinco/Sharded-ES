import { Kafka, KafkaConfig, Producer } from 'kafkajs';

// General kafka info
const kafkaConfig: KafkaConfig = {brokers: ['localhost:9093']}
const kafka = new Kafka(kafkaConfig)

// Kafka Producer
const producer = kafka.producer()
const test = async () => {
    await producer.connect()
    await producer.send({
    topic: 'test-topic',
    messages: [
        { headers: { source: 'test-app' } ,
         value: 'Hello KafkaJS user!' },
    ],
    })
}