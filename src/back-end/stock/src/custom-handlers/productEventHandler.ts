
import { RedisClientType } from "redis";

// Handle event and update the state of the stock list
export async function productEventHandler(redis: RedisClientType, event: any) {

    let data = event.data;
    let product_id = data.id;
    switch (event.type) {
        case "ProductDeleted": {
            console.log("Product deleted event received");
            // Get the list of warehouses for the product
            const warehouses = await redis.lRange(product_id, 0, -1);
            for (const warehouse of warehouses) {
                const stock_id = product_id + ":" + warehouse;
                // Check if the stock entry exists
                const stock_entry = await redis.hGet(stock_id, 'stock');
                if (stock_entry !== null) {
                    // Remove the stock entry
                    console.log("Stock entry found for warehouse: ", warehouse);
                    await redis.hDel(stock_id, 'stock').catch((error: any) => {
                        console.log("Error in set method: ", error);
                        throw error;
                    }).then(() => {
                        console.log("Stock successfully removed");
                    });
                } else {
                    console.log("Stock entry not found for warehouse: ", warehouse);
                }
                // Remove the warehouse from the product
                await redis.lRem(product_id, 0, warehouse).catch((error: any) => {
                    console.log("Error in set method: ", error);
                    throw error;
                }).then(() => {
                    console.log("Warehouse successfully removed from the product");
                });
            }

            break;
        }
    }
}
