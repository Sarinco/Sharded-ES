<script>
	import '../app.postcss';
	import '../assets/css/app.css';
	import { onMount } from 'svelte';
	import { user } from '@stores/auth';
	import { cart } from '@stores/cart';
	import Toasts from '@interfaces/toasts/Toasts.svelte';
	import Cart from '@interfaces/cart/Cart.svelte';
	import { goto } from '$app/navigation';

	export const ssr = false;

	onMount(async () => {
		// Initialize stored auth session
		let localUser = window.localStorage.getItem('auth');
		if (localUser) {
			console.log(JSON.parse(localUser));
			$user = JSON.parse(localUser);
		}

		// Initialize cart
		let localCart = window.localStorage.getItem('cart');
		if (localCart) {
			$cart = JSON.parse(localCart);
		}

		// Initialize local products list
		// TODO
	});

	function logout() {
		$user.isLogged = false;
		$user.isAdmin = false;
		window.localStorage.removeItem('auth');
		goto('/');
	}
</script>

<Toasts />

<nav class="navbar navbar-expand-lg navbar-light bg-light">
	<div class="container px-4 px-lg-5">
		<a class="navbar-brand" href="#!">Scapp</a>
		<div class="navbar-collapse">
			<ul class="navbar-nav me-auto mb-2 mb-lg-0 ms-lg-4">
				<li class="nav-item"><a class="nav-link active" aria-current="page" href="/">Home</a></li>
				{#if $user.isAdmin}
					<li class="nav-item"><a class="nav-link" href="/admin">admin</a></li>
				{/if}
				{#if !$user.isLogged}
					<li class="nav-item"><a class="nav-link" href="/register">Register</a></li>
					<li class="nav-item"><a class="nav-link" href="/login">Sign in</a></li>
				{:else}
					<li class="nav-item">
						<a class="nav-link" href="/" on:click|preventDefault={logout}>Logout</a>
					</li>
				{/if}
			</ul>

			{#if $user.isLogged}
				<Cart />
			{/if}
		</div>
	</div>
</nav>

<slot />
