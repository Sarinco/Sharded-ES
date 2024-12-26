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

- `GET /products`: Get all the products
- `POST /buy`: Buy a product with a count 
- `PUT /`: Update a product
- `POST /add`: Create a product

To test it you can use the following curl commands:

```bash
curl http://localhost:80/api/products/add \
   -H "Content-Type: application/json" \-d '{"name": "NAME", "price": 10}'
```
This command create a simple product with a name and a price and add it to the database.


The rest is not supposed to work now but should later.

```bash
curl http://localhost:80/api/products/buy \
   -H "Content-Type: application/json" \-d '{"id": "ID", "count": 2}'

curl http://localhost:80/api/products 

curl -X PUT http://localhost:80/api/products/ \
   -H "Content-Type: application/json" \-d '{"id": "ID", "field": "field_to_change", "updateValue": "new_value"}'
```
