
// Adding a new product event
export class ProductAddedEvent {
    id: string;
    name: string;
    price: number;
    description: string;
    image: string;
    category: string;
    added_by: string;

    constructor(id: string, name: string, price: number, description: string, image: string, category: string, added_by: string) {
        this.id = id;
        this.name = name;
        this.price = price;
        this.description = description;
        this.image = image;
        this.category = category;
        this.added_by = added_by;
    }

    static fromJSON(json: any): ProductAddedEvent {
        return new ProductAddedEvent(json.id, json.name, json.price, json.description, json.image, json.category, json.added_by);
    }

    toJSON(): any {
        // Return a JSON representation for KafkaJS
        return {
            key: this.id,
            value: JSON.stringify({
                type: "ProductAdded",
                data: {
                    id: this.id,
                    name: this.name,
                    price: this.price,
                    description: this.description,
                    image: this.image,
                    category: this.category,
                    added_by: this.added_by
                }
            })
        }
    }
};

// Buying a product event
export class ProductBoughtEvent {
    id: string;
    count: number;
    warehouse_id: string;
    bought_by: string;

    constructor(id: string, count: number, warehouse_id: string, bought_by: string) {
        this.id = id;
        this.count = count;
        this.warehouse_id = warehouse_id;
        this.bought_by = bought_by;
    }

    static fromJSON(json: any): ProductBoughtEvent {
        return new ProductBoughtEvent(json.id, json.count, json.warehouse_id, json.bought_by);
    }

    toJSON(): any {
        // Return a JSON representation for KafkaJS
        return {
            key: this.id,
            value: JSON.stringify({
                type: "ProductBought",
                data: {
                    id: this.id,
                    count: this.count,
                    warehouse_id: this.warehouse_id,
                    bought_by: this.bought_by
                }
            })
        }
    }
};

// Updating a product event
export class ProductUpdatedEvent {
    id: string;
    name: string;
    price: number;
    description: string;
    image: string;
    category: string;
    updated_by: string;


    constructor(id: string, name: string, price: number, description: string, image: string, category: string, updated_by: string) {
        this.id = id;
        this.name = name;
        this.price = price;
        this.description = description;
        this.image = image;
        this.category = category;
        this.updated_by = updated_by;
    }

    static fromJSON(json: any): ProductUpdatedEvent {
        return new ProductUpdatedEvent(json.id, json.name, json.price, json.description, json.image, json.category, json.updated_by);
    }

    toJSON(): any {
        // Return a JSON representation for KafkaJS
        return {
            key: this.id,
            value: JSON.stringify({
                type: "ProductUpdated",
                data: {
                    id: this.id,
                    name: this.name,
                    price: this.price,
                    description: this.description,
                    image: this.image,
                    category: this.category,
                    updated_by: this.updated_by
                }
            })
        }
    }
};

export class ProductDeletedEvent {
    id: string;
    deleted_by: string;

    constructor(id: string, deleted_by: string) {
        this.id = id;
        this.deleted_by = deleted_by;
    }

    static fromJSON(json: any): ProductDeletedEvent {
        return new ProductDeletedEvent(json.id, json.deleted_by);
    }

    toJSON(): any {
        // Return a JSON representation for KafkaJS
        return {
            key: this.id,
            value: JSON.stringify({
                type: "ProductDeleted",
                data: {
                    id: this.id,
                    deleted_by: this.deleted_by
                }
            })
        }
    }
}
