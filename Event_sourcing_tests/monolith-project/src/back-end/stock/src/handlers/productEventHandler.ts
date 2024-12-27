import { Product } from "../types/product";
import { ProductAddedEvent, ProductBoughtEvent, ProductUpdatedEvent } from "../types/stock-events";

// Handle event and update the state of the product list
export function productEventHandler(state: Product[], event: any) {
    switch (event.type) {
        case "ProductAdded":
            const productAddedEvent = event.data as ProductAddedEvent;
            state.push(new Product(productAddedEvent.id, productAddedEvent.name, productAddedEvent.price, productAddedEvent.description, productAddedEvent.image, productAddedEvent.category, productAddedEvent.count));
            console.log("Product added successfully");
            break;
        default:
            console.log("Invalid event type");
            break;
    }
}
