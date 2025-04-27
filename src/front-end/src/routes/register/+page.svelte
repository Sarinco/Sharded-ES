<script>
	import { user } from '@stores/auth';
	import { goto } from '$app/navigation';
	import { addToast } from '@stores/toasts';
	let email = '';
	let password = '';
    
    async function handleOnSubmit() {
        try {
            // Send a POST request to the registration API
            const response = await fetch('/api/users/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email, password }) // Include email and password in the body
            });

            // Check if the response is successful
            if (!response.ok) {
                throw new Error('Registration failed');
            }

            // Extract the token from the response headers
            const token = response.headers.get('Authorization');

            if (!token) {
                throw new Error('Token not found');
            }

            // Update the user store and localStorage
            $user.isLogged = true;
            $user.isAdmin = false;
            $user.token = token; // Store the token in the user store
            window.localStorage.setItem('auth', JSON.stringify($user));
            window.localStorage.setItem('email', email);
            window.localStorage.setItem('token', token); // Store the token in localStorage

            // Show a success toast
            addToast({
                message: 'Registration succeeded: Welcome!',
                type: 'success',
                dismissible: true,
                timeout: 3000
            });

            // Redirect to the home page
            goto('/');
        } catch (err) {
            // Show an error toast if registration fails
            addToast({
                message: `Registration failed: ${err}`,
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
						<h3 class="mb-5">Register</h3>

						<div class="form-outline mb-4">
							<input id="email" class="form-control form-control-lg" bind:value={email} />
							<label class="form-label" for="email">Email</label>
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

						<button class="btn btn-primary btn-lg btn-block" type="submit">Register</button>
					</div>
				</div>
			</div>
		</div>
	</div>
</form>
