// Product class 
export class Product{
    id: string; 
    name: string;
    price: number;
    description: string;
    image: string;
    category: string;
    count: number;

    constructor(id: string, name: string, price: number, description: string, image: string, category: string, count: number){
        this.id = id;
        this.name = name;
        this.price = price;
        this.description = description;
        this.image = image;
        this.category = category;
        this.count = count;
    }
}
