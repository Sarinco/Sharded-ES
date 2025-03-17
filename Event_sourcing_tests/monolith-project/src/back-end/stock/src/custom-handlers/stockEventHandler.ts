import { RedisClientType } from "redis";

// Custom imports


// Handle event and update the state of the stock list
export async function stockEventHandler(redis: RedisClientType, event: any) {
    switch (event.type) {
        default:
            console.log("Unknown event type");
            break;
    }
}
