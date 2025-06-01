# API Endpoints for the microservices

## Services

### Product service

The product service is a service that is responsible for managing the products of the project. It has the following endpoints:

- `GET /products`: Get all the products
- `PUT /`: Update a product
- `POST /add`: Create a product

To test it you can use the following curl commands:

```bash
curl http://localhost:80/api/products/ \
   -H "Content-Type: application/json" \-d '{"name": "Banana", "price": 5, "description": "Just a banana", "image": "https://plus.unsplash.com/premium_photo-1724250081106-4bb1be9bf950?w=900&auto=format&fit=crop&q=60&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8NXx8YmFuYW5hfGVufDB8fDB8fHww", "category": "Fruits"}'  -H "authorization:  eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJlbWFpbCI6ImFkbWluQHRlc3QuYmUiLCJyb2xlIjoiYWRtaW4iLCJpYXQiOjE3NDAzMDY1NDAsImV4cCI6MTc1NTg1ODU0MH0.q-ZZUj3Tphe6NEMOZAqtSGu1ziIxPjBaABpbZrCU2y0"
```
This command create a simple product with a name and a price and add it to the database.

```bash
 curl -X DELETE "http://localhost:80/api/products/5c729e31-8d5a-47e0-ab54-fb1233bd791d"
```
This command deletes the product with the id `5c729e31-8d5a-47e0-ab54-fb1233bd791d`.

```bash

curl -X PUT -H "Content-Type: application/json" -H "authorization: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJlbWFpbCI6ImFkbWluQHRlc3QuYmUiLCJyb2xlIjoiYWRtaW4iLCJpYXQiOjE3Mzg1MDQ3MDQsImV4cCI6MTczODU5MTEwNH0.M_DAAIrxolnnrdfFHTB7i4_d-kpv_4enWYu3ga8I5Y4" -d '{"name": "Banana", "price": 5, "description": "Just a banana", "image": "https://plus.unsplash.com/premium_photo-1724250081106-4bb1be9bf950?w=900&auto=format&fit=crop&q=60&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8NXx8YmFuYW5hfGVufDB8fDB8fHww", "count": 20, "category": "Fruits"}' http://localhost:80/api/products/56678d6d-a002-40cf-a44f-41036003bbb2
```

### Stock service

To decrease the stock
```bash
curl -X PUT http://localhost:80/api/stock/ebffe9cc-2bf0-4ff6-b68d-ec751635e8b4/decrease -H "Content-Type: application/json" -d '{"count": 100, "warehouse": "charleroi-sud"}'
```

To increase the stock
```bash
curl -X PUT http://localhost:80/api/stock/ebffe9cc-2bf0-4ff6-b68d-ec751635e8b4/increase -H "Content-Type: application/json" -d '{"count": 100, "warehouse": "charleroi-sud"}' -H "authorization:  eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJlbWFpbCI6ImFkbWluQHRlc3QuYmUiLCJyb2xlIjoiYWRtaW4iLCJpYXQiOjE3NDAzMDY1NDAsImV4cCI6MTc1NTg1ODU0MH0.q-ZZUj3Tphe6NEMOZAqtSGu1ziIxPjBaABpbZrCU2y0"
```

To set the stock to a specific value
```bash
curl -X POST http://localhost:80/api/stock/ebffe9cc-2bf0-4ff6-b68d-ec751635e8b4 -H "Content-Type: application/json" -d '{"count": 200, "warehouse": "charleroi-sud"}' -H "authorization:  eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJlbWFpbCI6ImFkbWluQHRlc3QuYmUiLCJyb2xlIjoiYWRtaW4iLCJpYXQiOjE3NDAzMDY1NDAsImV4cCI6MTc1NTg1ODU0MH0.q-ZZUj3Tphe6NEMOZAqtSGu1ziIxPjBaABpbZrCU2y0"
```

To get the stock of a product
```bash
# All the warehouses
curl http://localhost:80/api/stock/ebffe9cc-2bf0-4ff6-b68d-ec751635e8b4

# Specific warehouse
curl http://localhost:80/api/stock/ebffe9cc-2bf0-4ff6-b68d-ec751635e8b4\?warehouse\=charleroi-sud
```


### User service

The user service is a service that is responsible for managing the users of the project. It has the following endpoints:

- `POST /register`: Register a user
- `POST /login`: Login a user
- `GET /`: Get all the users (need to be admin)
- `GET /:email`: Get a user by email (need to be admin or the user itself)
- `DELETE /:email`: Delete a user by email (need to be admin or the user itself)


To test it you can use the following curl commands:

```bash
curl http://localhost:80/api/users/register \
   -H "Content-Type: application/json" \-d '{"email": "admin@test.be", "password":"admin"}'

#Use the following command to get the token
curl -v http://localhost:80/api/users/login \
   -H "Content-Type: application/json" \-d '{"email": "admin@test.be", "password":"admin"}'

curl http://localhost:80/api/users/ \
   -H "authorization: jwt_token" | jq

curl http://localhost:80/api/users/example@example.com \
    -H "authorization: jwt_token" | jq

curl http://localhost:80/api/users/ \
   -H "authorization: jwt_token"
```

The jwt_token is the token that you get when you login in the header, you need to add -v in the login command to have the header !!. You can use the token to get all the users. 


### Order service

Example for orders the location need to be a valid stock location.
```bash
curl http://localhost:80/api/orders/ \
   -H "Content-Type: application/json" \-d '{"customer": "012345", "location": "louvain-west", "product": "456789", "count": "10"}'
```


### Filter management

To be able to add or remove filter, you need to executes curl requests
inside one of the docker container of the proxies and send the filter 
management query TO THE MASTER PROXY, or this won't work (for now)


```bash
curl -X POST proxy-1/filter \
   -H "Content-Type: application/json" \
   -d '{"topic": "test", "key": "test", "value": "test", "filter": {"test":"test"}}'
