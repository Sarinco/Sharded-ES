import { writable } from 'svelte/store';

export const user = writable({ isLogged: false, isAdmin: false });
