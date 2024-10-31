# Monolith project

## Structure

The project has a `src` folder with the source code of the project and all the different services of the project. The `utils` folder is for useful files such as the `base-service` folder that contains a empty structure for a service. The `docker-compose.yaml` file is to run the project and build the images of the services. The `Dockerfile` is to build the image of the project.

## Starting the project

The start the project you only need to run the following command in the root of the project:

```bash
docker-compose up
```

The front-end and backend are setup to automatically reload when the files are changed.

