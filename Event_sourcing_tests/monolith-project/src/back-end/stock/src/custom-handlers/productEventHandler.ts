import { Product } from "../types/product";
import { ProductAddedEvent, ProductDeletedEvent, ProductUpdatedEvent } from "../types/events/stock-events";
import { RedisClientType } from "redis";

// Handle event and update the state of the product list
export function productEventHandler(redis: RedisClientType, event: any) {
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
            redis.set(
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

            redis.del(productDeletedEvent.id).catch((error: any) => {
                console.log("Error in delete method: ", error);
                throw error;
            }).then(() => {
                console.log("Product deleted successfully in the Redis");
            });

            break;
        case "ProductUpdated":
            const productUpdatedEvent = event.data as ProductUpdatedEvent;

            redis.get(productUpdatedEvent.id).then((product: any) => {
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
                redis.set(
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
            console.log("Invalid event type");
            break;
    }
}
