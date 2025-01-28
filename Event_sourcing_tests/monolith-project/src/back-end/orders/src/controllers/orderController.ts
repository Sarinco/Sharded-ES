const { Kafka, EachMessagePayload } = require('kafkajs');
import { v4 as uuid } from 'uuid';
import "../types/order";
// ajouter import pour events product added etc...
// ajouter import pour le eventhandler orders (todo)
import { ProducerFactory } from '../handlers/kafkaHandler';
import { Cassandra } from '../handlers/cassandraHandler';

// create a client connected to your local kafka instance
const EVENT_ADDRESS = process.env.EVENT_ADDRESS || "localhost";
const EVENT_PORT    = process.env.EVENT_PORT    || "9092";
const client        = new Kafka({
    clientId: 'event-pipeline',
    brokers:  [`${EVENT_ADDRESS}:${EVENT_PORT}`]
});
const EVENT_CLIENT_ID = process.env.EVENT_CLIENT_ID || "order-service";

// for cassandra
const DB_ADDRESS = process.env.DB_ADDRESS || "localhost";
const DB_PORT    = process.env.DB_PORT    || "9043";
const KEYSPACE   = process.env.KEYSPACE   || "orders";
