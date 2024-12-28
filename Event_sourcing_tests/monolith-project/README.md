# Monolith project

## Structure

The project has a `src` folder with the source code of the project and all the different services of the project. The `utils` folder is for useful files such as the `base-service` folder that contains a empty structure for a service. The `docker-compose.yaml` file is to run the project and build the images of the services. The `Dockerfile` is to build the image of the project.

## Starting the project

The start the project you only need to run the following command in the root of the project:

```bash
docker-compose up
```

The front-end and backend are setup to automatically reload when the files are changed.
There a init-db file that is run in the product service to initialize the database with some products if there is none, but for some reason if there no products in the database it will add them and not start the server so you will need to re-run the command.


## Services

### Product service

The product service is a service that is responsible for managing the products of the project. It has the following endpoints:

- `GET /stock`: Get all the products
- `PUT /`: Update a product
- `POST /add`: Create a product

To test it you can use the following curl commands:

```bash
curl http://localhost:80/api/stock/add \
   -H "Content-Type: application/json" \-d '{"name": "NAME", "price": 10}'

curl http://localhost:80/api/stock/add \
   -H "Content-Type: application/json" \-d '{"name": "banana", "price": 10, "description": "Just a banana", "image": "https://plus.unsplash.com/premium_photo-1724250081106-4bb1be9bf950?w=900&auto=format&fit=crop&q=60&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8NXx8YmFuYW5hfGVufDB8fDB8fHww", "count": 20, "category": "Fruits"}'
# For a nice example of a banana
```
This command create a simple product with a name and a price and add it to the database.

```bash
 curl -X DELETE "http://localhost:80/api/stock/5c729e31-8d5a-47e0-ab54-fb1233bd791d"
```
This command deletes the product with the id `5c729e31-8d5a-47e0-ab54-fb1233bd791d`.

```bash
curl +PUT "http://localhost:80/api/stock/2f75b6cc-00d1-4c84-aaca-adbcd7cf8166" \                          ─╯
-H "Content-Type: application/json" \
-d '{"field": "name", "updateValue": "banana1"}'
```
This command updates the product with the id `2f75b6cc-00d1-4c84-aaca-adbcd7cf8166` with the new name `banana1`. !! NOT WORKING YET !!
