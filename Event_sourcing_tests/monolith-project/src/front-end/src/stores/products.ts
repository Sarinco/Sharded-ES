import { derived, writable } from 'svelte/store';
import axios from 'axios';
import { addToast } from '@stores/toasts';
import { env } from '$env/dynamic/public';
import { Product } from '../types/product';

const PRODUCT_URL = `${import.meta.env.VITE_GATEWAY_URL}/api/stock` || 'http://localhost:80/api/stock';
console.log('PRODUCT_URL:', PRODUCT_URL);

const headers = {
    'Content-Type': 'application/json',
    'authorization': null,
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
            const response = await axios.get(PRODUCT_URL, { headers });
            const data = response.data;
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
            const response = await axios.post(PRODUCT_URL, product, { headers });
            const data = response.data;
            console.log('created product:', data);
            getProducts();
        } catch (error) {
            handleError(error, 'create product');
        }
    };

    const updateProduct = async (id: string, field: string, updateValue: any) => {
        try {
            const response = await axios.put(`${PRODUCT_URL}/${id}`, { field, updateValue }, { headers });
            console.log('updated product:', response.data);
            getProducts();
        } catch (error) {
            handleError(error, 'update product');
        }
    };

    const deleteProduct = async (id: string) => {
        try {
            const response = await axios.delete(`${PRODUCT_URL}/${id}`, { headers });
            console.log('deleted product:', response.data);
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
            headers.Authorization = `${token}`;
        },
        clearHeaders: () => {
            headers.Authorization = null;
        },
    };
}

export const products = createProducts();

export const productsMerged = derived(products, ($products) => {
    return Object.values($products).flat();
});
