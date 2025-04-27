import { derived, writable } from 'svelte/store';
import { addToast } from '@stores/toasts';
import { env } from '$env/dynamic/public';
import { Product } from '../types/product';

const PRODUCT_URL = `${import.meta.env.VITE_GATEWAY_URL}/api/products` || 'http://localhost:80/api/products';
const STOCK_URL = `${import.meta.env.VITE_GATEWAY_URL}/api/stock` || 'http://localhost:80/api/stock';
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

            const categorizedProducts = await categorizeProducts(data);
            set(categorizedProducts);
            return categorizedProducts;
        } catch (error) {
            handleError(error, 'get products');
        }
    };

    const categorizeProducts = async (products: any[]): Promise<any> => {
        const categorizedProducts: any = {};

        for (const product of products) {
            const response = await fetch(`${STOCK_URL}/${product.id}`, {
                method: 'GET',
            });
            const stock = await response.json();
            console.log('stock:', stock);
            const total_stock = stock.reduce((acc: number, stock: any) => acc + parseInt(stock.stock), 0);

            product.stock = total_stock;

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
            headers.authorization = "";
        },
    };
}

export const products = createProducts();

export const productsMerged = derived(products, ($products) => {
    return Object.values($products).flat();
});
