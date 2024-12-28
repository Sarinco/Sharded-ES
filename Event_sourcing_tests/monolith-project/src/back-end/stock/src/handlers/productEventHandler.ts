import { Product } from "../types/product";
import { ProductAddedEvent, ProductDeletedEvent, ProductUpdatedEvent } from "../types/stock-events";

// Handle event and update the state of the product list
export function productEventHandler(state: Product[], event: any) {
    switch (event.type) {
        case "ProductAdded":
            const productAddedEvent = event.data as ProductAddedEvent;
            state.push(new Product(productAddedEvent.id, productAddedEvent.name, productAddedEvent.price, productAddedEvent.description, productAddedEvent.image, productAddedEvent.category, productAddedEvent.count));
            console.log("Product added successfully");
            break;
        case "ProductDeleted":
            const productDeletedEvent = event.data as ProductDeletedEvent;
            const index = state.findIndex(product => product.id === productDeletedEvent.id);
            if (index !== -1) {
                state.splice(index, 1);
                console.log("Product deleted successfully");
            } else {
                console.log("Product not found");
            }
            break;
        case "ProductUpdated":
            const productUpdatedEvent = event.data as ProductUpdatedEvent;
            const product = state.find(product => product.id === productUpdatedEvent.id);
            if (product) {
                switch (productUpdatedEvent.field) {
                    case "name":
                        product.name = productUpdatedEvent.updateValue;
                        break;
                    case "price":
                        product.price = parseFloat(productUpdatedEvent.updateValue);
                        break;
                    case "description":
                        product.description = productUpdatedEvent.updateValue;
                        break;
                    case "image":
                        product.image = productUpdatedEvent.updateValue;
                        break;
                    case "category":
                        product.category = productUpdatedEvent.updateValue;
                        break;
                    case "count":
                        product.count = parseInt(productUpdatedEvent.updateValue);
                        break;
                    default:
                        console.log("Invalid field");
                        break;
                }
                console.log("Product updated successfully");
            } else {
                console.log("Product not found");
            }
            break;
            
        default:
            console.log("Invalid event type");
            break;
    }
}
