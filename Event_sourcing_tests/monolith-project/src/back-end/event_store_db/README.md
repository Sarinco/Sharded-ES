# EventStoreDB - Test
## Starting the project
First of all you need to have a EventStoreDB instance running. You can use the docker-compose file in the root of the project to start a instance of EventStoreDB. Just run the following command in the root of the project:
```bash
docker-compose up -d
```
But to run the EventStoreDB in a cluster of 3 there is another docker-compose file in the root of the project. Just run the following command in the root of the project:
```bash
docker-compose -f docker-compose-cluster.yml up -d
```
To access the EventStoreDB UI just access [http://localhost:2113](http://localhost:2113) in your browser.

## Tests
In the project we use the `typescript` client to test the functionnalities of the EventStoreDB. See src/index.ts for more information. To run the index.ts file run the following command in the root of the project:
```bash
npm run start
```
For more information about the EventStoreDB client for typescript see [this link](https://developers.eventstore.com/clients/grpc/reading-events.html).

