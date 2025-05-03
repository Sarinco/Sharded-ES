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
import { MeasurementService } from "../measurer.ts";

const gateways = [
    "http://localhost:80",
    "http://localhost:81",
];
let admin_token = await adminLogin(gateways[0]);
let test_product_id = "";

const gateway_stock_map = new Map<string, string>();
gateway_stock_map.set(gateways[0], "charleroi-sud");
gateway_stock_map.set(gateways[1], "barcelone");

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

describe("Adding stock", () => {
    it("Should add the stock of the product in the correct gateway", async () => {

        // Then add stock to the product to the correct gateway
        for (const gateway of gateways) {
            const warehouse = gateway_stock_map.get(gateway);
            if (!warehouse) {
                expect.fail(`No warehouse found for gateway ${gateway}, bad test setup`);
            }
            try {
                await measurementServiceStock.measure(() => setStock(gateway, test_product_id, warehouse, 10, admin_token), "addStock", "Add stock", gateway);
            } catch (error) {
                expect.fail(`Add stock failed for ${gateway}: ${error}`);
            }
            try {
                // Finally, check if the stock is correctly 
                const stock = await measurementServiceStock.measure(() => getStockOfWarehouse(gateway, test_product_id, warehouse), "getStock", "Get stock", gateway);
            } catch (error) {
                expect.fail(`Get stock failed for ${gateway}: ${error}`);
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
                await measurementServiceStock.measure(() => deleteStock(gateway, test_product_id, warehouse, admin_token), "deleteStock", "Delete stock", gateway);
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
