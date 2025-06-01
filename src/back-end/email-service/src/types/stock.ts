/**
 * Stock class
 */
export class Stock {
    id: string;
    count: number;
    warehouse: string;

    constructor(id: string, count: number, warehouse: string) {
        this.id = id;
        this.count = count;
        this.warehouse = warehouse;
    }

    static fromJSON(json: { id: string; count: number; warehouse: string; }) {
        return new Stock(json.id, json.count, json.warehouse);
    }
}
