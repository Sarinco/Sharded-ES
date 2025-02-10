import { RedisClientType } from "redis";

// Custom imports
import { User } from "@src/types/user";
import {
    UserAddedEvent, 
    UserDeletedEvent, 
    UserUpdatedEvent
} from "@src/types/events/users-events";

export async function userEventHandler(redis: RedisClientType, event: any) {
    switch (event.type) {
        case "UserAdded":
            const userAddedEvent = event.data as UserAddedEvent;
            const newUser = new User(
                userAddedEvent.email,
                userAddedEvent.hash,
                userAddedEvent.salt,
                userAddedEvent.role
            );
            await redis.set(
                userAddedEvent.email,
                JSON.stringify(newUser)
            ).catch((error: any) => {
                console.log("Error in set method: ", error);
                throw error;
            }).then(() => {
                console.log("User added successfully in the Redis");
            });

            break;
        case "UserDeleted":
            const userDeletedEvent = event.data as UserDeletedEvent;

            await redis.del(userDeletedEvent.email).catch((error: any) => {
                console.log("Error in delete method: ", error);
                throw error;
            }).then(() => {
                console.log("User deleted successfully in the Redis");
            });

            break;
        case "UserUpdated":
            const userUpdatedEvent = event.data as UserUpdatedEvent;

            await redis.get(userUpdatedEvent.email).then(async (user: any) => {
                if (user === null) {
                    console.log("User not found in the Redis");
                    return;
                }
                const updatedUser = new User(
                    userUpdatedEvent.email,
                    userUpdatedEvent.hash,
                    userUpdatedEvent.salt,
                    userUpdatedEvent.role
                );
                await redis.set(
                    userUpdatedEvent.email,
                    JSON.stringify(updatedUser)
                ).catch((error: any) => {
                    console.log("Error in set method: ", error);
                    throw error;
                }).then(() => {
                    console.log("User updated successfully in the Redis");
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
