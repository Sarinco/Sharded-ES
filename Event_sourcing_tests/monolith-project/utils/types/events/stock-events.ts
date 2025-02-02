
// Adding a new product event
export class ProductAddedEvent {
    id: string;
    name: string;
    price: number;
    description: string;
    image: string;
    category: string;
    count: number;
    addedBy: string;

    constructor(id: string, name: string, price: number, description: string, image: string, category: string, count: number, addedBy: string) {
        this.id = id;
        this.name = name;
        this.price = price;
        this.description = description;
        this.image = image;
        this.category = category;
        this.count = count;
        this.addedBy = addedBy;
    }

    static fromJSON(json: any): ProductAddedEvent {
        return new ProductAddedEvent(json.id, json.name, json.price, json.description, json.image, json.category, json.count, json.addedBy);
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
                    count: this.count,
                    addedBy: this.addedBy
                }
            })
        }
    }
};

// Buying a product event
export class ProductBoughtEvent {
    id: string;
    count: number;
    boughtBy: string;

    constructor(id: string, count: number, boughtBy: string) {
        this.id = id;
        this.count = count;
        this.boughtBy = boughtBy;
    }

    static fromJSON(json: any): ProductBoughtEvent {
        return new ProductBoughtEvent(json.id, json.count, json.boughtBy);
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
                    boughtBy: this.boughtBy
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
    count: number;
    updatedBy: string;


    constructor(id: string, name: string, price: number, description: string, image: string, category: string, count: number, updatedBy: string) {
        this.id = id;
        this.name = name;
        this.price = price;
        this.description = description;
        this.image = image;
        this.category = category;
        this.count = count;
        this.updatedBy = updatedBy;
    }

    static fromJSON(json: any): ProductUpdatedEvent {
        return new ProductUpdatedEvent(json.id, json.name, json.price, json.description, json.image, json.category, json.count, json.updatedBy);
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
                    count: this.count,
                    updatedBy: this.updatedBy
                }
            })
        }
    }
};

export class ProductDeletedEvent {
    id: string;
    deletedBy: string;

    constructor(id: string, deletedBy: string) {
        this.id = id;
        this.deletedBy = deletedBy;
    }

    static fromJSON(json: any): ProductDeletedEvent {
        return new ProductDeletedEvent(json.id, json.deletedBy);
    }

    toJSON(): any {
        // Return a JSON representation for KafkaJS
        return {
            key: this.id,
            value: JSON.stringify({
                type: "ProductDeleted",
                data: {
                    id: this.id,
                    deletedBy: this.deletedBy
                }
            })
        }
    }
}
