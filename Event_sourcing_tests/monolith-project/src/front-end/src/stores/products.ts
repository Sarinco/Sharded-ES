import { derived, writable } from 'svelte/store';
import axios from 'axios';
import { addToast } from '@stores/toasts';
import { env } from '$env/dynamic/public';
// import { Product } from '../types/product';

const PRODUCT_URL = `${import.meta.env.VITE_PRODUCT_URL}/api/products` || 'http://localhost:5000/products';
console.log('PRODUCT_URL:', PRODUCT_URL);

function createProducts() {
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
			const response = await axios.get(PRODUCT_URL);
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

		return categorizedProducts;
	};

	const { subscribe, set, update } = writable(getProducts());

	return {
		subscribe,
		update,
		set,
	};
}
function staticCatalog() {
	return {
		Vegetables: [
			{
				id: 1,
				name: 'Brocolli',
				price: 2.73,
				image:
					'https://res.cloudinary.com/sivadass/image/upload/v1493620046/dummy-products/broccoli.jpg',
				category: 'Vegetables'
			},
			{
				id: 2,
				name: 'Cauliflower',
				price: 6.3,
				image:
					'https://res.cloudinary.com/sivadass/image/upload/v1493620046/dummy-products/cauliflower.jpg',
				category: 'Vegetables'
			},
			{
				id: 3,
				name: 'Cucumber',
				price: 5.6,
				image:
					'https://res.cloudinary.com/sivadass/image/upload/v1493620046/dummy-products/cucumber.jpg',
				category: 'Vegetables'
			},
			{
				id: 4,
				name: 'Beetroot',
				price: 8.7,
				image:
					'https://res.cloudinary.com/sivadass/image/upload/v1493620045/dummy-products/beetroot.jpg',
				category: 'Vegetables'
			}
		],
		Fruits: [
			{
				id: 5,
				name: 'Apple',
				price: 2.34,
				image:
					'https://res.cloudinary.com/sivadass/image/upload/v1493620045/dummy-products/apple.jpg',
				category: 'Fruits'
			},
			{
				id: 6,
				name: 'Banana',
				price: 1.69,
				image:
					'https://res.cloudinary.com/sivadass/image/upload/v1493620045/dummy-products/banana.jpg',
				category: 'Fruits'
			},
			{
				id: 7,
				name: 'Grapes',
				price: 5.98,
				image:
					'https://res.cloudinary.com/sivadass/image/upload/v1493620045/dummy-products/grapes.jpg',
				category: 'Fruits'
			},
			{
				id: 8,
				name: 'Mango',
				price: 6.8,
				image:
					'https://res.cloudinary.com/sivadass/image/upload/v1493620045/dummy-products/mango.jpg',
				category: 'Fruits'
			}
		]
	};
}


export const products = createProducts();

export const productsMerged = derived(products, ($products) => {
	return Object.values($products).flat();
});
