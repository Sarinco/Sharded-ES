import { EventStoreDBClient, jsonEvent, FORWARDS, START } from "@eventstore/db-client";
import { v4 as uuid } from 'uuid';
import { Product } from "../types/product";
import { ProductAddedEvent, ProductBoughtEvent, ProductUpdatedEvent } from "../types/product-events";

// Create a client connected to your local EventStoreDB instance
const DB_ADDRESS = process.env.DB_ADDRESS || "localhost";
const DB_PORT = process.env.DB_PORT || "2113";
const client = EventStoreDBClient.connectionString(`esdb://${DB_ADDRESS}:${DB_PORT}?tls=false`);

const product = {
    // Retrieve all products
    findAll: async (req: any, res: any) => {
        try {
            const products: Product[] = [];
            console.log("Calling the findAll method");

            // Retrieve all products form products-projection
            const events: any[] = await client.getProjectionResult("products-projection");

            for (const [id, product] of Object.entries(events)) {
                products.push(new Product(id, product.name, product.price, product.description, product.image, product.category, product.count));
            }
            res.send(products);
        } catch (error) {
            console.log("Error in findAll method: ", error);
            res.status(500).send
        }
    },

    // Add a new product
    add: async (req: any, res: any) => {
        try {
            const event = jsonEvent<ProductAddedEvent>({
                type: "ProductAdded",
                data: {
                    id: uuid(),
                    name: req.body.name,
                    price: req.body.price,
                    description: req.body.description,
                    image: req.body.image,
                    category: req.body.category,
                    count: req.body.count
                }
            });
            await client.appendToStream("products", event);
            res.send("Product added successfully");
        } catch (error) {
            console.log("Error in add method: ", error);
            res.status(500).send
        }
    },

    // Buy a product
    buy: async (req: any, res: any) => {
        try {
            console.log("req.body: ", req.body);
            console.log("Calling the buy method with id: ", req.body.id, " and count: ", req.body.count);
            if (req.body.count <= 0) {
                res.status(400).send("Invalid count");
                return;
            }
            if (req.body.id === undefined || req.body.id === "") {
                res.status(400).send("Invalid id");
                return;
            }
            const event = jsonEvent<ProductBoughtEvent>({
                type: "ProductBought",
                data: {
                    id: req.body.id,
                    count: req.body.count
                }
            });
            await client.appendToStream("products", event);
            res.send("Product bought successfully");
        } catch (error) {
            console.log("Error in buy method: ", error);
            res.status(500).send
        }
    },


    // Update a product
    update: async (req: any, res: any) => {
        try {
            console.log("req.body: ", req.body);
            console.log("Calling the update method with id: ", req.body.id, " and field: ", req.body.field, " and updateValue: ", req.body.updateValue);
            if (req.body.id === undefined || req.body.id === "") {
                res.status(400).send("Invalid id");
                return;
            }
            if (req.body.field === undefined || req.body.field === "") {
                res.status(400).send("Invalid field");
                return;
            }
            if (req.body.updateValue === undefined || req.body.updateValue === "") {
                res.status(400).send("Invalid updateValue");
                return;
            }
            const event = jsonEvent<ProductUpdatedEvent>({
                type: "ProductUpdated",
                data: {
                    id: req.body.id,
                    field: req.body.field,
                    updateValue: req.body.updateValue
                }
            });
            await client.appendToStream("products", event);
            res.send("Product updated successfully");
        } catch (error) {
            console.log("Error in update method: ", error);
            res.status(500).send

        }
    }
}

export default product;
