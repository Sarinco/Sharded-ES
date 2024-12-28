
// Adding a new product event
export class ProductAddedEvent {
    id: string;
    name: string;
    price: number;
    description: string;
    image: string;
    category: string;
    count: number;

    constructor(id: string, name: string, price: number, description: string, image: string, category: string, count: number) {
        this.id = id;
        this.name = name;
        this.price = price;
        this.description = description;
        this.image = image;
        this.category = category;
        this.count = count;
    }

    static fromJSON(json: any): ProductAddedEvent {
        return new ProductAddedEvent(json.id, json.name, json.price, json.description, json.image, json.category, json.count);
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
                    count: this.count
                }
            })
        }
    }
};

// Buying a product event
export class ProductBoughtEvent {
    id: string;
    count: number;

    constructor(id: string, count: number) {
        this.id = id;
        this.count = count;
    }

    static fromJSON(json: any): ProductBoughtEvent {
        return new ProductBoughtEvent(json.id, json.count);
    }

    toJSON(): any {
        // Return a JSON representation for KafkaJS
        return {
            key: this.id,
            value: JSON.stringify({
                type: "ProductBought",
                data: {
                    id: this.id,
                    count: this.count
                }
            })
        }
    }
};

// Updating a product event
export class ProductUpdatedEvent {
    id: string;
    field: string;
    updateValue: string;

    constructor(id: string, field: string, updateValue: string) {
        this.id = id;
        this.field = field;
        this.updateValue = updateValue;
    }

    static fromJSON(json: any): ProductUpdatedEvent {
        return new ProductUpdatedEvent(json.id, json.field, json.updateValue);
    }

    toJSON(): any {
        // Return a JSON representation for KafkaJS
        return {
            key: this.id,
            value: JSON.stringify({
                type: "ProductUpdated",
                data: {
                    id: this.id,
                    field: this.field,
                    updateValue: this.updateValue
                }
            })
        }
    }

};

export class ProductDeletedEvent {
    id: string;

    constructor(id: string) {
        this.id = id;
    }

    static fromJSON(json: any): ProductDeletedEvent {
        return new ProductDeletedEvent(json.id);
    }

    toJSON(): any {
        // Return a JSON representation for KafkaJS
        return {
            key: this.id,
            value: JSON.stringify({
                type: "ProductDeleted",
                data: {
                    id: this.id
                }
            })
        }
    }
}
