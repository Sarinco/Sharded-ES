<script lang="ts">
	import Product from './Product.svelte';
	import { products } from '@stores/products';
</script>

<section class="py-2">
	<div class="container px-4 px-lg-5">
		{#each Object.keys($products) as category}
			<section>
				<div
					class="container p-3 px-lg-5 my-4 bg-gradient-to-r from-indigo-500 from-10% via-sky-500 via-30% to-emerald-500 to-90%"
				>
					<div class="text-center text-white">
						<h1 class="display-4 fw-bolder">{category}</h1>
					</div>
				</div>
			</section>
			<div class="row gx-4 gx-lg-5 row-cols-2 row-cols-md-3 row-cols-xl-4 justify-content-center">
				{#each $products[category] as product}
					<Product {product} />
				{/each}
			</div>
		{/each}
	</div>
</section>
