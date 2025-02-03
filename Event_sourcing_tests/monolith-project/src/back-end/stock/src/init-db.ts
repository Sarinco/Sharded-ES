import { Kafka } from "kafkajs";
import { v4 as uuid } from 'uuid';
import { Product } from "./types/product";
import { ProductAddedEvent } from "./types/stock-events";

// Create a client connected to your local EventStoreDB instance
const DB_ADDRESS = process.env.DB_ADDRESS || "localhost";
const DB_PORT = process.env.DB_PORT || "9092";

const client = new Kafka({
    clientId: 'event-pipeline',
    brokers: [`${DB_ADDRESS}:${DB_PORT}`],
});

const producer = client.producer()

async function addProduct(product: Product) {
    console.log("Adding new product: ", product.name);
    const event = new ProductAddedEvent(
        product.id,
        product.name,
        product.price,
        product.description,
        product.image,
        product.category,
        product.count
    );
    await producer.send({
        topic: 'products',
        messages: [event.toJSON()]
    });
}

async function checkProductStream(products: any[]) {
    await producer.connect();
    products.forEach(product => {
        addProduct(new Product(uuid(), product.name, product.price, "", product.image, product.category, 10));
    });
}

const products = [
    {
        id: 1,
        name: 'Brocolli',
        price: 2.73,
        image:
            'https://res.cloudinary.com/sivadass/image/upload/v1493620046/dummy-products/broccoli.jpg',
        category: 'Vegetables',
    },
    {
        id: 2,
        name: 'Cauliflower',
        price: 6.3,
        image:
            'https://res.cloudinary.com/sivadass/image/upload/v1493620046/dummy-products/cauliflower.jpg',
        category: 'Vegetables'
    },
    {
        id: 3,
        name: 'Cucumber',
        price: 5.6,
        image:
            'https://res.cloudinary.com/sivadass/image/upload/v1493620046/dummy-products/cucumber.jpg',
        category: 'Vegetables'
    },
    {
        id: 4,
        name: 'Beetroot',
        price: 8.7,
        image:
            'https://res.cloudinary.com/sivadass/image/upload/v1493620045/dummy-products/beetroot.jpg',
        category: 'Vegetables'
    },
    {
        id: 5,
        name: 'Apple',
        price: 2.34,
        image:
            'https://res.cloudinary.com/sivadass/image/upload/v1493620045/dummy-products/apple.jpg',
        category: 'Fruits'
    },
    {
        id: 6,
        name: 'Banana',
        price: 1.69,
        image:
            'https://res.cloudinary.com/sivadass/image/upload/v1493620045/dummy-products/banana.jpg',
        category: 'Fruits'
    },
    {
        id: 7,
        name: 'Grapes',
        price: 5.98,
        image:
            'https://res.cloudinary.com/sivadass/image/upload/v1493620045/dummy-products/grapes.jpg',
        category: 'Fruits'
    },
    {
        id: 8,
        name: 'Mango',
        price: 6.8,
        image:
            'https://res.cloudinary.com/sivadass/image/upload/v1493620045/dummy-products/mango.jpg',
        category: 'Fruits'
    }
]

checkProductStream(products);
console.log("Product sent");
