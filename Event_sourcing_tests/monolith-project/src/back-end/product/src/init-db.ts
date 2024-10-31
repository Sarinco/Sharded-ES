import { EventStoreDBClient, jsonEvent, FORWARDS, START, JSONEventType } from "@eventstore/db-client";
import { v4 as uuid } from 'uuid';
import { Product } from "./types/product";
import { ProductAddedEvent } from "./types/product-events";

// Create a client connected to your local EventStoreDB instance
const DB_ADDRESS = process.env.DB_ADDRESS || "localhost";
const DB_PORT = process.env.DB_PORT || "2113";
const client = EventStoreDBClient.connectionString(`esdb://${DB_ADDRESS}:${DB_PORT}?tls=false`);

function addProduct(product: Product) {
    const event = jsonEvent<ProductAddedEvent>({
        type: "ProductAdded",
        data: {
            id: product.id,
            name: product.name,
            price: product.price,
            description: product.description,
            image: product.image,
            category: product.category,
            count: product.count
        }
    });
    client.appendToStream("products", event);
}

async function checkProductStream(products: any[]) {
    const events = client.readStream<ProductAddedEvent>("products", {
        direction: FORWARDS,
        fromRevision: START,
        maxCount: 10,
    });
    try {
        for await (const _ of events) {
            console.log("Stream already exists");
            break;
        }
    } catch (error) {
        console.log("Creating a new stream");
        // Add products to the stream
        products.forEach(product => {
            addProduct(new Product(uuid(), product.name, product.price, "", product.image, product.category, 10));
        });
    }
}

async function addProductsProjection() {
    const projection = `
fromStream('products')
    .when({
        $init() {
            return {};
        },
        ProductAdded(state, event) {
            const productId = event.data.id;
            const initialCount = event.data.count || 0;
            if (!state[productId]) {
                state[productId] = { 
                name: event.data.name,
                price: event.data.price,
                description: event.data.description,
                image: event.data.image,
                category: event.data.category,
                count: initialCount 
                };
            }
        },
        ProductBought(state, event) {
            const productId = event.data.id;
            const itemsBought = event.data.count || 0;
            if (state[productId]) {
                state[productId].count -= itemsBought;
            }
        },
        ProductUpdated(state, event) {
            const productId = event.data.id;
            const field = event.data.field;
            const updateValue = event.data.updateValue;
            if (state[productId]) {
                state[productId][field] = updateValue;
            }
        }
    })
.outputState()
    `;
    const name = "products-projection";
    try {
        await client.createProjection(name, projection);
        console.log("Projection created successfully");
    } catch (error: any) {
        if (!error.message.includes("Conflict"))
            throw error;
        console.log(`${name} already exists`);
    }
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
addProductsProjection();

client.dispose();
