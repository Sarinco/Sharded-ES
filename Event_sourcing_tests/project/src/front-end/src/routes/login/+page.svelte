<script>
	import { user } from '@stores/auth';
	import { goto } from '$app/navigation';

	import { addToast } from '@stores/toasts';

	let username = '';
	let password = '';

	function handleOnSubmit() {
		if (username === 'admin' && password === 'admin') {
			window.localStorage.setItem('username', 'admin');
			window.localStorage.setItem('password', 'admin');
			$user.isLogged = true;
			$user.isAdmin = true;
			window.localStorage.setItem('auth', JSON.stringify($user));
			addToast({
				message: `Welcome back ${username}!`,
				type: 'success',
				dismissible: true,
				timeout: 3000
			});
			goto('/');
			return;
		}
		let localUser = window.localStorage.getItem('username');
		if (localUser && localUser === username) {
			let localPassw = window.localStorage.getItem('password');
			if (localPassw === password) {
				$user.isLogged = true;
				$user.isAdmin = false;
				window.localStorage.setItem('auth', JSON.stringify($user));
				addToast({
					message: `Welcome back ${username}!`,
					type: 'success',
					dismissible: true,
					timeout: 3000
				});
				goto('/');
				return;
			} else {
				addToast({
					message: 'Login error: wrong password',
					type: 'error',
					dismissible: true,
					timeout: 3000
				});
			}
		} else {
			addToast({
				message: 'Login error: unknown username',
				type: 'error',
				dismissible: true,
				timeout: 3000
			});
		}
	}
</script>

<form method="POST" on:submit|preventDefault={handleOnSubmit}>
	<div class="container py-5 h-100">
		<div class="row d-flex justify-content-center align-items-center h-100">
			<div class="col-12 col-md-8 col-lg-6 col-xl-5">
				<div class="card shadow-2-strong" style="border-radius: 1rem;">
					<div class="card-body p-5 text-center">
						<h3 class="mb-5">Sign in</h3>

						<div class="form-outline mb-4">
							<input id="username" class="form-control form-control-lg" bind:value={username} />
							<label class="form-label" for="username">Username</label>
						</div>

						<div class="form-outline mb-4">
							<input
								type="password"
								id="password"
								class="form-control form-control-lg"
								bind:value={password}
							/>
							<label class="form-label" for="password">Password</label>
						</div>

						<button class="btn btn-primary btn-lg btn-block" type="submit">Login</button>
					</div>
				</div>
			</div>
		</div>
	</div>
</form>
