import { Product } from "@src/types/product";
import { OrderAddedEvent } from "@src/types/order-events";
import { RedisClientType } from "redis";

export async function orderEventHandler(redis: RedisClientType, event: any) {
    switch (event.type) {
        case "OrderAdded":
            const orderInfo = event.data as OrderAddedEvent;
            console.log("order received for processing");
            console.log(orderInfo);

            const previousStockString = await redis.get(orderInfo.product);
            if (previousStockString == null) {
                console.log("Specified product not in stock");
                return;
            }

            const previousStockJson = JSON.parse(previousStockString);
            let stockEntry = Product.fromJSON(previousStockJson);
            if (stockEntry.count < orderInfo.count){
                console.log("Not enough product in stock to satisfy the order");
                return;
            }
            stockEntry.count -= orderInfo.count;


            await redis.set(
                stockEntry.id,
                JSON.stringify(stockEntry)
            ).catch((error: any) => {
                console.log("Error in set method: ", error);
                throw error;
            }).then(() => {
                console.log("Product successfully updated after order");
            });

        break;

        default :
            console.log("no actions for event type :", event.type, "Event ignored");
            break;
    }
}
