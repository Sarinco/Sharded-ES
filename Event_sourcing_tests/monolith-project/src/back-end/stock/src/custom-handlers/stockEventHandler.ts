import { RedisClientType } from "redis";

// Custom imports
import { Stock } from "@src/types/stock";


// Handle event and update the state of the stock list
export async function stockEventHandler(redis: RedisClientType, event: any) {
    let data = event.data;
    let stock = new Stock(data.product, data.count, data.warehouse);
    let stock_id = stock.id + ":" + stock.warehouse;
    let stockString = await redis.hGetAll(`${stock_id}`);
    switch (event.type) {
        case "IncreaseStock": {
            console.log("Increase stock event received");
            let newStock = 0;
            console.log("Stock count: ", stock.count, " and stockString: ", stockString);
            if (stockString.stock == undefined || stockString.stock == null || stockString.stock == "NaN") {
                console.log("Specified stock not found adding entry to the stock list: ", stock.id + "==>" + stock.warehouse);
                await redis.lPush(stock.id, stock.warehouse).catch((error: any) => {
                    console.log("Error in add method: ", error);
                    throw error;
                }).then(() => {
                    console.log("Warehouse successfully added to the product");
                });
                newStock = stock.count;
            } else {
                let oldStock = parseInt(stockString.stock);
                // Check if oldStock is NaN
                if (isNaN(oldStock)) {
                    oldStock = 0;
                }
                newStock = oldStock + stock.count;
            }

            console.log("New stock: ", newStock);
            await redis.hSet(`${stock_id}`, 'stock', newStock).catch((error: any) => {
                console.log("Error in set method: ", error);
                throw error;
            }).then(() => {
                console.log("Stock successfully increased");
            });

            break;
        }
        case "DecreaseStock": {
            console.log("Decrease stock event received");
            if (stockString.stock === undefined) {
                console.log("Specified stock not found so not decreasing stock");
                return;
            }

            let newStock = parseInt(stockString.stock) - stock.count;
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

            if (stockString.stock === undefined) {
                console.log("Specified stock not found adding entry to the stock list");
                await redis.lPush(stock.id, stock.warehouse).catch((error: any) => {
                    console.log("Error in add method: ", error);
                    throw error;
                }).then(() => {
                    console.log("Warehouse successfully added to the product");
                });
            }
            await redis.hSet(`${stock_id}`, 'stock', stock.count).catch((error: any) => {
                console.log("Error in set method: ", error);
                throw error;
            }).then(() => {
                console.log("Stock successfully added");
            });

            break;
        }
        default:
            console.log("Unknown event type");
            break;
    }
}
