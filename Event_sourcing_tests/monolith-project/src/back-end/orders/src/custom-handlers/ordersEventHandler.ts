import Order from  "../types/order"
import { OrderAddedEvent } from "../types/order-events";
import { RedisClientType } from "redis";

export async function ordersEventHandler(redis: RedisClientType, event: any) {
    switch (event.type) {
        case "OrderAdded":
            const orderAddedEvent = event.data as OrderAddedEvent;
            const newOrder = new Order(
                orderAddedEvent.id,
                orderAddedEvent.customer,
                orderAddedEvent.location,
                orderAddedEvent.product,
                orderAddedEvent.count
            );
            await redis.set(
                orderAddedEvent.id,
                JSON.stringify(newOrder)
            ).catch((error: any) => {
                console.log("Error in set method ", error);
                throw error;
            }).then(() => {
                console.log("Product added successfully in the Redis");
            });

        break;
        default:
            console.log("Invalid event type");
            break;
    }
}
