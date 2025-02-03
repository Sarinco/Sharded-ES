// Orders class
export default class Order {
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

    getColumnList(): string {
        return '(id, customer, location, product, count)'
    }

    getOrder(): string {
        return `(${this.id}, ${this.customer}, ${this.location}, ${this.product}, ${this.count})`
    }

}