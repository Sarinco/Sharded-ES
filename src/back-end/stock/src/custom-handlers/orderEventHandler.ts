import { OrderAddedEvent } from "@src/types/events/order-events";
import { RedisClientType } from "redis";
import { producer } from "@src/controllers/stockController";
import { DecreaseStockEvent } from "@src/types/events/stock-event";

export async function orderEventHandler(redis: RedisClientType, event: any) {
    switch (event.type) {
        case "OrderAdded":
            const orderInfo = event.data as OrderAddedEvent;
            console.log("order received for processing");
            console.log(orderInfo);

            const warehouse = orderInfo.location;
            const product = orderInfo.product;
            const stock_id = product + ":" + warehouse;
            const stockString = await redis.hGet(stock_id, 'stock');

            if (stockString === null) {
                console.log("Specified stock not found so not processing order");
                return;
            }
            const newEvent: DecreaseStockEvent = new DecreaseStockEvent(product, orderInfo.count, warehouse);

            producer.send(
                'stock',
                newEvent.toJSON()
            ).then(() => {
                console.log("Stock decrease event sent");
            }).catch((error: any) => {
                console.log("Error in sending stock decrease event: ", error);
            });

        break;

        default :
            console.log("no actions for event type :", event.type, "Event ignored");
            break;
    }
}
