
export class OrderAddedEvent {
    id: string;
    customer: string;
    location: string;
    product: string;
    count: number;

    constructor(id: string, customer: string, location: string, product: string, count: number){
        this.id = id;
        this.customer = customer;
        this.location = location;
        this.product = product;
        this.count = count;
    }

    static fromJSON(json: any): OrderAddedEvent {
        return new OrderAddedEvent(json.id, json.customer, json.location, json.product, json.count);
    }

    toJSON() : any {
        return {
            key : this.id,
            value: JSON.stringify({
                type: "OrderAdded",
                data: {
                    id: this.id,
                    customer: this.customer,
                    location: this.location,
                    product: this.product,
                    count: this.count
                }
            })
        }
    }
};