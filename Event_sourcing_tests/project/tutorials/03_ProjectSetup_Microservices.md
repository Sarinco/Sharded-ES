# :books: LINFO2145 Project: 

**LINFO2145 Autumn, 2023** -- *Etienne Rivière, Donatien Schmitz, Yinan Cao, and Samy Bettaieb*

## Objectives

This tutorial will show you how to:

1. Call the Authentication service from the front-end.

:bulb: **Recall.**
We encourage you to follow the tutorial solo.

:bulb: **Recall.**
This tutorial requires you to complete some exercises that are tagged with this icon: :pencil2:

## Introduction

By now, you should have completed the previous tutorial on creating an authentication service (AuthServ for short).
The AuthServ exposes a REST API over HTTP.
Recall that it stores authentication information of users in memory.
In other words, information is not persistent.

This section explains how to link the REST API of AuthS from the provided front-end.
Open [`../src/front-end/src/routes/register/+page.svelte`](../src/front-end/src/routes/register/+page.svelte).
This is the source code that stores authentication information locally (i.e., in the browser temporary storage) for the registration process.

:pencil2: Replace the whole content of this file with the code below.
It is important to read and understand the content and principles of this code.
Use resources online if necessary to make sure you have a clear vision of how the code works: you will need to be able to write similar code for your own services.

``` svelte
<script>
  
  import { user } from "@stores/auth";
  import { goto } from "$app/navigation";
  import { env } from "$env/dynamic/public";
  import { addToast } from "@stores/toasts";
  import axios from "axios";

  const url = env.PUBLIC_AUTH_SERVICE_URL || "http://localhost:3001";

  let username = "";
  let password = "";
  function handleOnSubmit() {
    axios
      .post(`${url}/user`, { username, password })
      .then((res) => {
        $user.isLogged = true;
        $user.isAdmin = false;
        window.localStorage.setItem("auth", JSON.stringify($user));
        addToast({
          message: "Registration succeeded: Welcome!",
          type: "success",
          dismissible: true,
          timeout: 3000,
        });
        goto("/");
      })
      .catch((err) => {
        addToast({
          message: "Registration completed with an error.",
          type: "error",
          dismissible: true,
          timeout: 3000,
        });
      });
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
              <input
                id="username"
                class="form-control form-control-lg"
                bind:value={username}
              />
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

            <button class="btn btn-primary btn-lg btn-block" type="submit"
              >Register</button
            >
          </div>
        </div>
      </div>
    </div>
  </div>
</form>
```

The functions *handleOnSubmit()* sends a HTTP request of the AuthServ REST API.
To send this HTTP request, we will use the `axios` package.

:warning:
Note that the URL of AuthServ is taken from the environment variable `PUBLIC_AUTH_SERVICE_URL`. Be sure you set this variable accordingly, either in the Dockerfile or using the option `-e` in the command `docker run`.

:warning:
Your login page ([see code](../src/front-end/src/routes/login/+page.svelte)) still uses the old non-persistent login logic.

:pencil: Replace the content of the `handleOnSubmit()` function so that it sends an HTTP request to the correct endpoint.

Now, rebuild the front-end image and re-launch the container.

Open to the web interface, register a new user, and log out.
Close your web browser, and re-open the application.
You will notice that you are now able to log in using the same credentials, as those are now stored in the backend.

:pencil: Confirm that AuthS receive calls to its API by consulting its logs.

:checkered_flag: You can now head to the [**second part**](./04_NoSQL_databases.md) of this tutorial on using persistent storage for your microservices.

