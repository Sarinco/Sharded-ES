import { derived, writable } from 'svelte/store';

function createCart() {
	const { subscribe, set, update } = writable([]);

	return {
		subscribe,
		update,
		addToCart: (item) =>
			update((oldCart) => {
				const itemIndex = oldCart.findIndex((e) => e.id === item.id);
				if (itemIndex === -1) {
					return [...oldCart, item];
				} else {
					oldCart[itemIndex].quantity += item.quantity;
					return oldCart;
				}
			})
	};
}

export const cart = createCart();

export const totalQuantity = derived(cart, ($cart) =>
	$cart.reduce((acc, curr) => acc + curr.quantity, 0)
);

export const totalPrice = derived(cart, ($cart) =>
	$cart.reduce((acc, curr) => acc + curr.quantity * curr.price, 0)
);
