import { JSONEventType } from "@eventstore/db-client";

// Product class 
export class Product{
    id: string; 
    name: string;
    price: number;
    description: string;
    image: string;
    category: string;
    count: number;

    constructor(id: string, name: string, price: number, description: string, image: string, category: string, count: number){
        this.id = id;
        this.name = name;
        this.price = price;
        this.description = description;
        this.image = image;
        this.category = category;
        this.count = count;
    }
}

// Adding a new product event
export type ProductAddedEvent = JSONEventType<
    "ProductAdded",
    {
        id: string;
        name: string;
        price: number;
        description: string;
        image: string;
        category: string;
        count: number;
    }
>;

// Buying a product event
export type ProductBoughtEvent = JSONEventType<
    "ProductBought",
    {
        id: string;
        count: number;
    }
>;

// Updating a product event
export type ProductUpdatedEvent = JSONEventType<
    "ProductUpdated",
    {
        id: string;
        field: string;
        updateValue: string;
    }
>;
