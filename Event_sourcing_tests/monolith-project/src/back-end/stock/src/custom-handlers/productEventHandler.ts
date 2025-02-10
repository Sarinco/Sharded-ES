import { RedisClientType } from "redis";

// Custom imports
import { Product } from "@src/types/product";
import {
    ProductAddedEvent,
    ProductDeletedEvent,
    ProductUpdatedEvent
} from "@src/types/events/stock-events";


// Handle event and update the state of the product list
export async function productEventHandler(redis: RedisClientType, event: any) {
    switch (event.type) {
        case "ProductAdded":
            const productAddedEvent = event.data as ProductAddedEvent;
            const newProduct = new Product(
                productAddedEvent.id,
                productAddedEvent.name,
                productAddedEvent.price,
                productAddedEvent.description,
                productAddedEvent.image,
                productAddedEvent.category,
                productAddedEvent.count
            );
            await redis.set(
                productAddedEvent.id,
                JSON.stringify(newProduct)
            ).catch((error: any) => {
                console.log("Error in set method: ", error);
                throw error;
            }).then(() => {
                console.log("Product added successfully in the Redis");
            });

            break;
        case "ProductDeleted":
            const productDeletedEvent = event.data as ProductDeletedEvent;

            await redis.del(productDeletedEvent.id).catch((error: any) => {
                console.log("Error in delete method: ", error);
                throw error;
            }).then(() => {
                console.log("Product deleted successfully in the Redis");
            });

            break;
        case "ProductUpdated":
            const productUpdatedEvent = event.data as ProductUpdatedEvent;

            await redis.get(productUpdatedEvent.id).then(async (product: any) => {
                if (product === null) {
                    console.log("Product not found in the Redis");
                    return;
                }
                const updatedProduct = new Product(
                    productUpdatedEvent.id,
                    productUpdatedEvent.name,
                    productUpdatedEvent.price,
                    productUpdatedEvent.description,
                    productUpdatedEvent.image,
                    productUpdatedEvent.category,
                    productUpdatedEvent.count
                );
                await redis.set(
                    productUpdatedEvent.id,
                    JSON.stringify(updatedProduct)
                ).catch((error: any) => {
                    console.log("Error in set method: ", error);
                    throw error;
                }).then(() => {
                    console.log("Product updated successfully in the Redis");
                });
            }).catch((error: any) => {
                console.log("Error in get method: ", error);
                throw error;
            });

            break;

        default:
            console.log("Unknown event type");
            break;
    }
}
