// Product class 
export class Product {
    id: string; 
    name: string;
    price: number;
    description: string;
    image: string;
    category: string;
    stock: number;

    constructor(id: string, name: string, price: number, description: string, image: string, category: string){
        this.id = id;
        this.name = name;
        this.price = price;
        this.description = description;
        this.image = image;
        this.category = category;
        this.stock = 0;
    }

    static fromJSON(json: any): Product {
        return new Product(json.id, json.name, json.price, json.description, json.image, json.category);
    }
}
