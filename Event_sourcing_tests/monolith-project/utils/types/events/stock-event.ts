/**
 * This is the event that is triggered when the stock of a product is increased.
 */
export class IncreaseStockEvent {
    product: string;
    count: number;
    warehouse: string;

    constructor(product: string, count: number, warehouse: string) {
        this.product = product;
        this.count = count;
        this.warehouse = warehouse;
    }

    /**
     * This method is used to create an instance of the IncreaseStockEvent class from a JSON
     *
     * @param json - The JSON object to create the instance from. The JSON should follow the schema:
     * {    product: string;   count: number;  warehouse: string; }
     * @returns An instance of the IncreaseStockEvent class
     * @throws An error if the JSON object does not follow the schema
     * @example IncreaseStockEvent.fromJSON({ product: "product1", count: 10, warehouse: "charleroi-sud" });
     */
    static fromJSON(json: { product: string; count: number; warehouse: string; }) {
        return new IncreaseStockEvent(json.product, json.count, json.warehouse);
    }

    /**
     * This method is used to convert an instance of the IncreaseStockEvent class to a JSON object
     * in the format ready to be sent to a kafka topic
     *
     * @returns The JSON representation of the IncreaseStockEvent instance
     * @example IncreaseStockEvent.toJSON();
     */
    toJSON() {
        return {
            key: this.product,
            value: JSON.stringify({
                type: "IncreaseStock",
                data: {
                    product: this.product,
                    count: this.count,
                    warehouse: this.warehouse
                }
            })
        };
    }
}

/**
 * This is the event that is triggered when the stock of a product is decreased.
 */
export class DecreaseStockEvent {
    product: string;
    count: number;
    warehouse: string;

    constructor(product: string, count: number, warehouse: string) {
        this.product = product;
        this.count = count;
        this.warehouse = warehouse;
    }
    
    /**
     * This method is used to create an instance of the DecreaseStockEvent class from a JSON
     *
     * @param json - The JSON object to create the instance from. The JSON should follow the schema:
     * {    product: string;   count: number; warehouse: string; }
     * @returns An instance of the DecreaseStockEvent class
     * @throws An error if the JSON object does not follow the schema
     * @example DecreaseStockEvent.fromJSON({ product: "product1", count: 10, warehouse: "charleroi-sud" });
     */
    static fromJSON(json: { product: string; count: number; warehouse: string; }) {
        return new DecreaseStockEvent(json.product, json.count, json.warehouse);
    }

    /**
     * This method is used to convert an instance of the DecreaseStockEvent class to a JSON object
     * in the format ready to be sent to a kafka topic
     *
     * @returns The JSON representation of the DecreaseStockEvent instance
     * @example DecreaseStockEvent.toJSON();
     */
    toJSON() {
        return {
            key: this.product,
            value: JSON.stringify({
                type: "DecreaseStock",
                data: {
                    product: this.product,
                    count: this.count,
                    warehouse: this.warehouse
                }
            })
        };
    }
}

/**
 * This is the event that is triggered when the stock of a product is updated.
 * The stock of the product is set to the count specified in the event.
 */
export class UpdateStockEvent {
    product: string;
    count: number;
    warehouse: string;

    constructor(product: string, count: number, warehouse: string) {
        this.product = product;
        this.count = count;
        this.warehouse = warehouse;
    }

    /**
     * This method is used to create an instance of the UpdateStockEvent class from a JSON
     *
     * @param json - The JSON object to create the instance from. The JSON should follow the schema:
     * {    product: string;   count: number; warehouse: string; }
     * @returns An instance of the UpdateStockEvent class
     * @throws An error if the JSON object does not follow the schema
     * @example UpdateStockEvent.fromJSON({ product: "product1", count: 10, warehouse: "charleroi-sud" });
     */
    static fromJSON(json: { product: string; count: number; warehouse: string; }) {
        return new UpdateStockEvent(json.product, json.count, json.warehouse);
    }

    /**
     * This method is used to convert an instance of the UpdateStockEvent class to a JSON object
     * in the format ready to be sent to a kafka topic
     *
     * @returns The JSON representation of the UpdateStockEvent instance
     * @example UpdateStockEvent.toJSON();
     */
    toJSON() {
        return {
            key: this.product,
            value: JSON.stringify({
                type: "UpdateStock",
                data: {
                    product: this.product,
                    count: this.count,
                    warehouse: this.warehouse
                }
            })
        };
    }
}
