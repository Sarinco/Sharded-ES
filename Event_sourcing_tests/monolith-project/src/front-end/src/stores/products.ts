import { derived, writable } from 'svelte/store';
import { addToast } from '@stores/toasts';
import { env } from '$env/dynamic/public';
import { Product } from '../types/product';

const PRODUCT_URL = `${import.meta.env.VITE_GATEWAY_URL}/api/stock` || 'http://localhost:80/api/stock';
console.log('PRODUCT_URL:', PRODUCT_URL);

const headers = {
    'Content-Type': 'application/json',
    'authorization': "",
};

function createProducts() {
    const { subscribe, set, update } = writable([]);

    const handleError = (error: any, message: string) => {
        console.error(`${message}:`, error);
        addToast({
            message: `Failed to ${message.toLowerCase()}`,
            type: 'error',
            dismissible: true,
            timeout: 3000,
        });
    };

    const getProducts = async () => {
        try {
            const response = await fetch(PRODUCT_URL, { 
                method: 'GET',
            });

            if (!response.ok) {
                throw new Error('Failed to get products');
            }
            const data = await response.json();

            const categorizedProducts = categorizeProducts(data);
            set(categorizedProducts);
            console.log('categorizedProducts:', categorizedProducts);
            return categorizedProducts;
        } catch (error) {
            handleError(error, 'get products');
        }
    };

    const categorizeProducts = (products: any[]): any => {
        const categorizedProducts: any = {};

        for (const product of products) {
            if (!categorizedProducts[product.category]) {
                categorizedProducts[product.category] = [];
            }

            categorizedProducts[product.category].push(product);
        }
        console.log('categorizedProducts:', categorizedProducts);

        return categorizedProducts;
    };

    const createProduct = async (product: Product) => {
        try {
            const response = await fetch(PRODUCT_URL, {
                method: 'POST',
                headers,
                body: JSON.stringify(product),
            });

            if (!response.ok) {
                throw new Error('Failed to create product');
            }

            const data = await response.json();
            console.log('created product:', data);
            getProducts();
        } catch (error) {
            handleError(error, 'create product');
        }
    };

    const updateProduct = async (product: Product) => {
        try {
            const response = await fetch(`${PRODUCT_URL}/${product.id}`, {
                method: 'PUT',
                headers,
                body: JSON.stringify(product),
            });

            if (!response.ok) {
                throw new Error('Failed to update product');
            }

            const data = await response.json();
            console.log('updated product:', data);
            getProducts();
        } catch (error) {
            handleError(error, 'update product');
        }
    };

    const deleteProduct = async (id: string) => {
        try {
            const response = await fetch(`${PRODUCT_URL}/${id}`, {
                method: 'DELETE',
                headers,
            });

            if (!response.ok) {
                throw new Error('Failed to delete product');
            }

            const data = await response.json();
            console.log('deleted product:', data);
            getProducts();
        } catch (error) {
            handleError(error, 'delete product');
        }
    };

    getProducts()

    return {
        subscribe,
        update,
        set,
        createProduct,
        updateProduct,
        deleteProduct,
        updateHeaders: (token: string) => {
            headers.authorization = `${token}`;
        },
        clearHeaders: () => {
            headers.authorization = null;
        },
    };
}

export const products = createProducts();

export const productsMerged = derived(products, ($products) => {
    return Object.values($products).flat();
});
