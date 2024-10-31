import { JSONEventType } from "@eventstore/db-client";

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
