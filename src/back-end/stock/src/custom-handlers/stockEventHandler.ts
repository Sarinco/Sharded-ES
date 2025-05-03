import { RedisClientType } from "redis";

// Custom imports
import { Stock } from "@src/types/stock";


// Handle event and update the state of the stock list
export async function stockEventHandler(redis: RedisClientType, event: any) {
    let data = event.data;
    let stock: any;
    let stock_id: string = "";
    let stock_string: any = "";
    stock = new Stock(data.product, data.count, data.warehouse);
    stock_id = stock.id + ":" + stock.warehouse;
    stock_string = await redis.hGetAll(`${stock_id}`);
    switch (event.type) {
        case "IncreaseStock": {
            console.log("Increase stock event received");
            let new_stock = 0;
            console.log("Stock count: ", stock.count, " and stockString: ", stock_string);
            if (stock_string.stock == undefined || stock_string.stock == null || stock_string.stock == "NaN") {
                console.log("Specified stock not found adding entry to the stock list: ", stock.id + "==>" + stock.warehouse);
                await redis.lPush(stock.id, stock.warehouse).catch((error: any) => {
                    console.log("Error in add method: ", error);
                    throw error;
                }).then(() => {
                    console.log("Warehouse successfully added to the product");
                });
                new_stock = stock.count;
            } else {
                let old_stock = parseInt(stock_string.stock);
                // Check if oldStock is NaN
                if (isNaN(old_stock)) {
                    old_stock = 0;
                }
                new_stock = old_stock + stock.count;
            }

            console.log("New stock: ", new_stock);
            await redis.hSet(`${stock_id}`, 'stock', new_stock).catch((error: any) => {
                console.log("Error in set method: ", error);
                throw error;
            }).then(() => {
                console.log("Stock successfully increased");
            });

            break;
        }
        case "DecreaseStock": {
            console.log("Decrease stock event received");
            if (stock_string.stock === undefined) {
                console.log("Specified stock not found so not decreasing stock");
                return;
            }

            let newStock = parseInt(stock_string.stock) - stock.count;
            if (newStock < 0) {
                console.log("Not enough stock to decrease");
                return;
            }
            await redis.hSet(`${stock_id}`, 'stock', newStock).catch((error: any) => {
                console.log("Error in set method: ", error);
                throw error;
            }).then(() => {
                console.log("Stock successfully decreased");
            });
            break;
        }
        case "UpdateStock": {
            console.log("Update stock event received");
            const stock_count = stock.count;
            if (stock_string.stock === undefined && stock.count === 0) {
                console.log("Specified stock not found and stock count is 0 so not updating stock");
                return;
            }

            if (stock_string.stock === undefined) {
                console.info("Specified stock not found adding entry to the stock list");
                await redis.lPush(stock.id, stock.warehouse).catch((error: any) => {
                    console.error("Error in add method: ", error);
                    throw error;
                }).then(() => {
                    console.info("Warehouse successfully added to the product");
                });
            }
            if (stock.count === 0) {
                // Remove the stock entry
                console.log("Stock count is 0 so removing the stock entry");
                await redis.hDel(stock_id, 'stock').catch((error: any) => {
                    console.error("Error in set method: ", error);
                    throw error;
                }).then(() => {
                    console.info("Stock successfully removed");
                });
                await redis.lRem(stock.id, 0, stock.warehouse).catch((error: any) => {
                    console.error("Error in set method: ", error);
                    throw error;
                }).then(() => {
                    console.info("Warehouse successfully removed from the product");
                });
                return;
            }
            await redis.hSet(`${stock_id}`, 'stock', stock.count).catch((error: any) => {
                console.error("Error in set method: ", error);
                throw error;
            }).then(() => {
                console.info("Stock successfully added");
            });

            break;
        }

        default:
            console.debug("Unknown event type");
            break;
    }
}
