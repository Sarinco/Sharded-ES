import { CQRSEvent } from './CQRS-events';

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

export class GetAllOrderEvent extends CQRSEvent {
    
    constructor(path: string, auth: string) {
        super(path, auth);
    }

    fromJSON(json: { path: string; auth: string; }) {
        return new GetAllOrderEvent(json.path, json.auth);
    }

    toJSON() {
        return {
            key: "No Key",
            value: JSON.stringify({
                type: "GetAllOrder",
                path: this.path,
                auth: this.auth,
                data: {
                }
            })
        }
    }
}
