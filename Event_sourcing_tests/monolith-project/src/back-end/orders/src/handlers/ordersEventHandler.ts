import Order from  "../types/order"
import { OrderAddedEvent } from "../types/order-events";
import { Cassandra } from "./cassandraHandler"

export function ordersEventHandler(cassandra: Cassandra, event: any) {
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
            cassandra.insert('entry', newOrder.getColumnList(), newOrder.getOrder());

        break;
        default:
            console.log("Invalid event type");
            break;
    }
}
