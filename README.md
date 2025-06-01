# Thesis Project

This repository contains the code we used to build and test our thesis project. The goal of this project was to create a content-based routing for event sourced applications in a multi-site architecture.
The detail information about the project and the architecture can be found in our thesis document.

## Table of Contents
- [Structure](#structure)
- [Getting Started](#getting-started)
- [Testing](#testing)

## Structure

```bash
.
├── compose
├── site1
├── site2
├── site3
├── src
├── test
└── utils
```

The project is structured into several directories:
- `compose`: Contains the Docker Compose files to run the different services.
- `site1`, `site2`, `site3`: Each directory contains the configuration of the different sites.
- `src`: Contains the source code of the project as explained in [`src/README.md`](src/README.md).
- `test`: Contains the test code for the project.
- `utils`: Contains files that were used in multiple places in the project.

## Getting Started

The start the project you only need to run the following command in the root of the project:

```bash
# This will start the all project.
make up

# This will start the proxy
make up-proxy

# This will start the sites
make up-sites
```
This will start all the services in each site. The gateway of site 1 will be available at `http://localhost:80` and the gateway of site 2 will be available at `http://localhost:81`. More port are open for debugging purposes, but the main ones are 80 and 81.

To stop the project, you can run the following command:

```bash
# This will stop the all project.
make stop 

# This will stop the proxy
make stop-proxy

# This will stop the sites
make stop-sites
```

To clean the project containers, you can run the following command:

```bash
# This will clean the all project.
make down

# This will clean the proxy
make down-proxy

# This will clean the sites
make down-sites
```


## Testing

To run the tests, you can use the following command:

```bash
make test-no-write
```

This will run the tests without writing the results in a file. If you want to write the results in a file, you can use the following command:

```bash
make test NB_TESTS=100 FOLDER=results
```
This will run the tests and write the results in the `results` directory. You can change the number of tests to run by changing the `NB_TESTS` variable.
The command will output a latency report in the console to show the link latency between the sites. The report will also be written in the `results` directory. To change the virtual link latency, you can change the file `test/add_latency.sh` in the `test` directory. The file contains the latency in milliseconds to add to the link between the sites. To apply those latencies, you need to run the following command with the project running:

```bash
# This will add the latency to the links between the sites.
make add-latency

# This will remove the latency from the links between the sites.
make remove-latency

# This will test the latency between the sites.
make test-latency
```


