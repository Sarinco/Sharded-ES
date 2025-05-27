import { expect } from "chai";
import { describe, it } from "mocha";
import {
    getProducts,
    postProduct,
    updateProduct,
    deleteProduct,
} from "./index.ts";
import {
    MeasurementService,
    gateways,
} from "../measurer.ts";
import { adminLogin } from "../users/index.ts";
const wait = (ms: number | undefined) => new Promise(resolve => setTimeout(resolve, ms));

let admin_token = await adminLogin(gateways[0]);

const measurementService = MeasurementService.getInstance();
const measurementServiceProduct = measurementService.createChild("products");
let products_created: string[] = [];


describe("Get products", () => {
    it("Should return a list of products", async () => {
        for (const gateway of gateways) {
            try {
                const products = await measurementServiceProduct.measure(() => getProducts(gateway), "getProducts", "Get products", gateway, gateway);
                expect(products).to.be.an("array");
                expect(products.length).to.be.greaterThanOrEqual(0);
            } catch (error) {
                expect.fail(`Get products failed for ${gateway}: ${error}`);
            }
        }
    });
});

describe("Post product", () => {
    it("Should return a product on successful post", function(done) {
        for (const gateway of gateways) {
            try {
                const random_price = Math.floor(Math.random() * 100);
                measurementServiceProduct.measure(() => postProduct(gateway, random_price, admin_token), "postProduct", "Post product", gateway, gateway).then((product: any) => {
                    expect(product).to.be.an("object");
                    expect(product).to.have.property("id");
                    expect(product).to.have.property("name", "Test Product");
                    expect(product).to.have.property("price", random_price);
                    products_created.push(product.id);
                });
            } catch (error) {
                expect.fail(`Post product failed for ${gateway}: ${error}`);
            }
        }
        done() // Wait for the product to be created before proceeding
    });
    it("Should contain the product in the list of products", async () => {
        for (const gateway of gateways) {
            try {
                const products = await measurementServiceProduct.measure(() => getProducts(gateway), "getProducts", "Get products", gateway, gateway);
                expect(products).to.be.an("array");
                expect(products.length).to.be.greaterThan(0);
                const product = products.find((p: any) => p.name === "Test Product");
                expect(product).to.not.be.undefined;
            } catch (error) {
                expect.fail(`Get products failed for ${gateway}: ${error}`);
            }
        }
    });
});

describe("Update product", () => {
    it("Should return the updated product on successful update", function(done) {
        for (const gateway of gateways) {
            try {
                const random_price = Math.floor(Math.random() * 100);
                measurementServiceProduct.measure(() => updateProduct(gateway, "Test Product", random_price, admin_token), "updateProduct", "Update product", gateway, gateway).then((product: any) => {
                    // console.log("Product updated: ", product);
                    // expect(product).to.be.an("object");
                    // expect(product).to.have.property("id");
                    // expect(product).to.have.property("name", "Test Product");
                    // expect(product).to.have.property("price", random_price);
                });
            } catch (error) {
                expect.fail(`Update product failed for ${gateway}: ${error}`);
            }
        }
        done(); // Wait for the product to be updated before proceeding
    });
    it("Should contain the updated product in the list of products", function(done) {
        for (const gateway of gateways) {
            try {
                measurementServiceProduct.measure(() => getProducts(gateway), "getProducts", "Get products", gateway, gateway).then((products: any) => {

                    expect(products).to.be.an("array");
                    expect(products.length).to.be.greaterThan(0);
                    const product = products.find((p: any) => p.name === "Test Product");
                    expect(product).to.not.be.undefined;
                });
            } catch (error) {
                expect.fail(`Get products failed for ${gateway}: ${error}`);
            }
        }
        done(); // Wait for the product to be updated before proceeding
    });
});

describe("Delete product", () => {
    it("Should delete the product successfully", async () => {
        // await wait(1000);
        let i = 0;
        for (const gateway of gateways) {
            try {
                let productId = products_created[i++];
                if (!productId) {
                    throw new Error("No product ID found to delete");
                }
                await measurementServiceProduct.measure(() => deleteProduct(gateway, productId, admin_token), "deleteProduct", "Delete product", gateway, gateway);
                // console.log(`Deleted product ${productId} successfully for ${gateway}`);
            } catch (error) {
                expect.fail(`Delete product failed for ${gateway}: ${error}`);
            }
        }
        // await wait(1000); // Wait for the deletion to propagate
    });
    it("Should not contain the deleted product in the list of products", function(done) {
        for (const gateway of gateways) {
            try {
                measurementServiceProduct.measure(() => getProducts(gateway), "getProducts", "Get products", gateway, gateway).then((products: any) => {
                    
                    expect(products).to.be.an("array");
                    expect(products.length).to.be.greaterThanOrEqual(0);
                    const product = products.find((p: any) => p.name === "Test Product");
                    expect(product).to.be.undefined;
                });
            } catch (error) {
                expect.fail(`Get products failed for ${gateway}: ${error}`);
            }
        }
        done(); // Wait for the product to be deleted before proceeding
    });
    it("Should throw an error on failed delete", async () => {
        for (const gateway of gateways) {
            try {
                await deleteProduct(gateway, "nonexisting", admin_token);
                expect.fail(`Delete should have failed for ${gateway}`);
            } catch (error) {
                expect(error).to.be.an("error");
            }
        }
    });
});

