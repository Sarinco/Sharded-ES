import { expect } from "chai";
import { describe, it } from "mocha";
import {
    getAllStock,
    getStock,
    getStockOfWarehouse,
    setStock,
    increaseStock,
    decreaseStock,
    deleteStock,
} from "./index.ts";
import { adminLogin } from "../users/index.ts";
import { deleteProduct, postProduct } from "../products/index.ts";
import { 
    MeasurementService,
    gateways,
    gateway_stock_map,
} from "../measurer.ts";

let admin_token = await adminLogin(gateways[0]);
let test_product_id = "";

const measurementService = MeasurementService.getInstance();
const measurementServiceStock = measurementService.createChild("stock");


describe("Adding the test product", () => {
    it("Should add the test product in the correct gateway", async () => {
        // First create a fake product
        const random_price = Math.floor(Math.random() * 100);
        const product = await postProduct(gateways[0], random_price, admin_token);
        expect(product).to.be.an("object");
        expect(product).to.have.property("id");
        expect(product).to.have.property("name", "Test Product");
        expect(product).to.have.property("price", random_price);
        test_product_id = product.id;
    });
});

//INFO: Test of proxy latency
describe("Setting stock", () => {
    it("Should set the stock of the product in the correct gateway without sharding", async () => {
        // Then add stock to the product to the correct gateway
        for (const gateway of gateways) {
            const warehouse = gateway_stock_map.get(gateway);
            if (!warehouse) {
                expect.fail(`No warehouse found for gateway ${gateway}, bad test setup`);
            }
            try {
                await measurementServiceStock.measure(() => setStock(gateway, test_product_id, warehouse, 10, admin_token), "addStock", "Add stock", gateway, gateway);
            } catch (error) {
                expect.fail(`Add stock failed for ${gateway}: ${error}`);
            }
            try {
                // Finally, check if the stock is correctly 
                const stock = await measurementServiceStock.measure(() => getStockOfWarehouse(gateway, test_product_id, warehouse), "getStock", "Get stock", gateway, gateway);
            } catch (error) {
                expect.fail(`Get stock failed for ${gateway}: ${error}`);
            }

        }
    });
    it("Should set the stock of the product in the correct gateway with sharding", async () => {
        // Ex: Sending stock to barcelone to the gateway 0 in order to see if the 
        // stock is correctly forwarded to gateway 1
        for (const gateway of gateways) {
            const warehouse = gateway_stock_map.get(gateway);
            if (!warehouse) {
                expect.fail(`No warehouse found for gateway ${gateway}, bad test setup`);
            }
            for (const other_gateway of gateways) {
                if (other_gateway === gateway) {
                    continue;
                }
                try {
                    await measurementServiceStock.measure(() => setStock(other_gateway, test_product_id, warehouse, 20, admin_token), "addStock", "Add stock to the wrong gateway to see the time of the forwarding between sites", gateway, other_gateway);
                } catch (error) {
                    expect.fail(`Add stock failed for ${gateway}: ${error}`);
                }
                try {
                    // Finally, check if the stock is correctly 
                    const stock = await measurementServiceStock.measure(() => getStockOfWarehouse(gateway, test_product_id, warehouse), "getStock", "Get stock", gateway, gateway);
                    // Should be an array of objects
                    expect(stock).to.be.an("array");
                    expect(stock.length).to.be.greaterThan(0);
                    // Check if the stock is correctly 
                    for (const stock_entry of stock) {
                        expect(stock_entry).to.have.property("warehouse", warehouse);
                        expect(stock_entry).to.have.property("stock");
                        expect(stock_entry.stock).to.be.a("string");
                        expect(parseInt(stock_entry.stock)).to.be.greaterThan(0);
                        if (stock_entry.warehouse === warehouse) {
                            expect(parseInt(stock_entry.stock)).to.be.equal(20);
                        }
                    }
                    
                } catch (error) {
                    expect.fail(`Get stock failed for ${gateway}: ${error}`);
                }
            }
        }
    });
});

//INFO: Test of gateway latency
describe("Getting stock", () => {
    it("Should get the stock of the product in the wrong gateway", async () => {
        for (const gateway of gateways) {
            const warehouse = gateway_stock_map.get(gateway);
            if (!warehouse) {
                expect.fail(`No warehouse found for gateway ${gateway}, bad test setup`);
            }
            for (const other_gateway of gateways) {
                if (other_gateway === gateway) {
                    continue;
                }
                try {
                    const stock = await measurementServiceStock.measure(() => getStockOfWarehouse(other_gateway, test_product_id, warehouse), "getStock", "Get stock in the wrong gateway to test the gateway latency", other_gateway, gateway);
                    // Should be an array of objects
                    expect(stock).to.be.an("array");
                    expect(stock.length).to.be.greaterThan(0);
                    // Check if the stock is correctly 
                    for (const stock_entry of stock) {
                        expect(stock_entry).to.have.property("warehouse", warehouse);
                        expect(stock_entry).to.have.property("stock");
                        expect(stock_entry.stock).to.be.a("string");
                        expect(parseInt(stock_entry.stock)).to.be.greaterThan(0);
                        if (stock_entry.warehouse === warehouse) {
                            expect(parseInt(stock_entry.stock)).to.be.equal(20);
                        }
                    }
                } catch (error) {
                    expect.fail(`Get stock failed for ${other_gateway}: ${error}`);
                }
            }
        }
    });
});



describe("Removing the test product", () => {
    it("Should remove the stock of the test product in the correct gateway", async () => {
        for (const gateway of gateways) {
            const warehouse = gateway_stock_map.get(gateway);
            if (!warehouse) {
                expect.fail(`No warehouse found for gateway ${gateway}, bad test setup`);
            }
            try {
                await measurementServiceStock.measure(() => deleteStock(gateway, test_product_id, warehouse, admin_token), "deleteStock", "Delete stock", gateway, gateway);
            } catch (error) {
                expect.fail(`Delete stock failed for ${gateway}: ${error}`);
            }
        }
    });
    it("Should remove the test product in the correct gateway", async () => {
        try {
            await deleteProduct(gateways[0], test_product_id, admin_token);
        } catch (error) {
            expect.fail(`Post product failed for ${gateways[0]}: ${error}`);
        }
    });
});
