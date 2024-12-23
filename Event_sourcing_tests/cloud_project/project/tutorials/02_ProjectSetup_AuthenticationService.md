# :books: LINFO2145 Project: Authentication microservice

**LINFO2145 Autumn, 2023** -- *Etienne Rivière, Donatien Schmitz, Yinan Cao, and Samy Bettaieb*

## Objectives

This tutorial will show you how to:

1. Understand the design of an authentication microservice;
1. Build and deploy a first back-end microservice written in node.js;
1. Call this microservice from the front-end.

:bulb: **Recall.**
We encourage you to follow the tutorial solo.

:bulb: **Recall.**
This tutorial requires you to complete some exercises that are tagged with this icon: :pencil2:

## Introduction

The authentication microservice (AuthServ for short) exposes a REST API over HTTP.
It stores authentication information of users in memory.
In other words, information is not persistent.
The table below is a description of the REST API AuthServ exposes.

| Method | Uniform Resource Name (URN) | Required  parameters | Output | Description |
|:------:|:-----------------------------|:-------------------------------------:|:--------------------:|:--------------------------------------------------|
| POST | /user | username=[string] & password=[string] | Authentication token | Register a new user |
| GET | /user/:username/:password | - | Authentication token | Log in a user |

## Build and deploy

Back-end services for the shopping cart application go in folder `src/backend`.
This folder contains a single microservice, AuthServ.
Its source code is organized as follows:

``` text
src/back-end/users/
├── Dockerfile    << Docker file
├── gulpfile.js   << configuration file of development tasks
├── package.json  << node.js configuration file
└── src/
    ├── app.js    << REST API
    ├── daemon.js << launch the HTTP server
    └── utils/  << utils to create authentication tokens
```

Main files are in `src/`:

- `daemon.js`: is the entry point of the application, which launches an HTTP server.
- `app.js`: implements the logic of the authentication service and defines its REST API.
- `utils/`: contains helper functions used in the microservice implementation.

:pencil: **Exercises.**
Complete the following tasks to build and deploy AuthServ:

1. Build the docker image with the name `scapp-auth`;
1. Run the container in the background mapping the internal port 80 with an external (i.e.: on the virtual machine) PORT_AUTH of your choice.
1. Get the logs of the running container with the command `docker logs` - read the documentation of this command if necessary.

## Test AuthS with `curl`

You are now ready to test the REST API of AuthServ using the `curl` command-line HTTP client.

:bulb: **Documentation.** Find more details about the `curl` command in the official documentation ([link here](https://curl.haxx.se/docs/faq.html#What_is_cURL))

1. **Users registration**. Create a new user (new resource) using the interface `POST /user`:

    ```bash
    curl -X POST --data "username=admin&password=admin" localhost:PORT_AUTH/user
    ```

    Look at the logs of AuthS:
      - *What do you receive as an answer?*
      - *What is the meaning of the HTTP status code 200?*
      - You receive an authentication token within the answer of this call.
      *What do you think is the purpose of this token?*

1. **Users authentication**. `GET /user/:username/:password` authenticates the resource identified by `:username`, test this call with an unregistered user with: `curl -X GET localhost:PORT_AUTH/user/bob/alice`

- *What happens?*
- *What is the meaning of the status code 404?*
- Test again the same call with the user you create in step 1
  - *What happens now?*
  - *What might be the propose of having a new authentication token?*

## Source code

It is important to understand how AuthS is built before writing new microservices.

AuthS is a node.js server built with [express](https://github.com/expressjs/express), a framework to create HTTP servers.
The initial configuration of this server is in [../src/back-end/users/src/daemon.js](../src/back-end/users/src/daemon.js).
The following shows an extract:

```javascript
/* [...] */
// the REST API that AuthS expose is within the file app.js
const app = require('./app');
/* [...] */
// launch an exception when a request is not part of the REST API
server.use((req, res, next) => {
  const err = new Error('Not Found')
  /* [...] */
})
// OR we respond with the status code 500 if an error occurs
server.use((err, req, res, next) => {
  /* [...] */
  res.status(err.status || 500)
  res.json({
    status: 'error',
    message: err
  })
})
// daemon is now listening on port 80
const port = 80
server.listen(port, function () {
  log(`Listening at port ${port}`)
})
```

The concrete implementation of each REST call in AuthS is in [../src/back-end/users/src/app.js](../src/back-end/users/src/app.js).

Here, we present a stub of the call `POST /user` (other calls follow a similar structure).

``` javascript
app.post('/user', (req, res) => {
  var usr = req.body.username
  var usrPassw = req.body.password
  log(`Creating a new user (${usr}) identified with "${usrPassw}"`)
  return db.createUser(usr, usrPassw)
    .then((token) => {
      // successful creation of the user returns an authentication token
      res.status(200).json({ status: 'success', token })
    })
    .catch((err) => {
      // Creation of the authentication token failed or the user was already registered
      res.status(500).json({ status: 'error', message: String(err) })
    })
})
```

In the previous snippet, you may have noticed that function calls are chained.
AuthS uses [Javascript Promises](https://scotch.io/tutorials/javascript-promises-for-dummies) to guarantee the order in asynchronous calls.
A REST call in our microservice succeeds if every operation in the chain of functions succeeds.
