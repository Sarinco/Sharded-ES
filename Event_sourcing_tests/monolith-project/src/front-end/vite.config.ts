import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
	resolve: {
		alias: {
			'@stores': path.resolve('./src/stores/'),
			'@interfaces': path.resolve('./src/interfaces'),
            '@types': path.resolve('./src/types')
		}
	},
	plugins: [sveltekit()],
    server: {
        https: false,
        host: '0.0.0.0'
    }
});
