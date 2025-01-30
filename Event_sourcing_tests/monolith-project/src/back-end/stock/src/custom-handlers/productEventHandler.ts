import { Product } from "../types/product";
import { ProductAddedEvent, ProductDeletedEvent, ProductUpdatedEvent } from "../types/events/stock-events";
import { Cassandra } from '../handlers/cassandraHandler';

// Handle event and update the state of the product list
export function productEventHandler(cassandra: Cassandra, event: any) {
    switch (event.type) {
        case "ProductAdded":
            const productAddedEvent = event.data as ProductAddedEvent;
            const newProduct = new Product(
                productAddedEvent.id,
                productAddedEvent.name,
                productAddedEvent.price,
                productAddedEvent.description,
                productAddedEvent.image,
                productAddedEvent.category,
                productAddedEvent.count
            );  
            cassandra.insert('product', Product.getColumsList(), newProduct.createCQL());

            break;
        case "ProductDeleted":
            const productDeletedEvent = event.data as ProductDeletedEvent;
            const query = `DELETE FROM product WHERE id = ?`;
            cassandra.client.execute(query, [productDeletedEvent.id], { prepare: true }).then(() => {
                console.log("Product deleted successfully in the Database");
            }).catch((error: any) => {
                console.log("Error in delete method: ", error);
            })

            break;
        case "ProductUpdated":
            const productUpdatedEvent = event.data as ProductUpdatedEvent;
            const id = productUpdatedEvent.id;
            const field = productUpdatedEvent.field;
            let updateValue: any = productUpdatedEvent.updateValue;

            switch (field) {
                case "name":
                    break;
                case "price":
                    try {
                        updateValue = parseFloat(updateValue);
                    } catch (error) {
                        console.log("Invalid price");
                        return;
                    }
                case "description":
                    break;
                case "image":
                    break;
                case "category":
                    break;
                case 'count':
                    try {
                        updateValue = parseInt(updateValue);
                    } catch (error) {
                        console.log("Invalid count");
                        return;
                    }
                default:
                    console.log("Invalid field: ", field);
                    return;
            }
            console.debug("Updating product with id: ", id, " field: ", field, " value: ", updateValue);

            const queryUpdate = `UPDATE product SET ${field} = ? WHERE id = ?`;
            cassandra.client.execute(queryUpdate, [updateValue, id], { prepare: true }).then(() => {
                console.log("Product updated successfully in the Database");
            }).catch((error: any) => {
                console.log("Error in update method: ", error);
            })

            break;
            
        default:
            console.log("Invalid event type");
            break;
    }
}
