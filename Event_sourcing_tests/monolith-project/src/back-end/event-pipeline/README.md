# Kafka
## Quick Start
Here is the quick start guide to run test that the compose work.
To enter the broker container run the following command:
```bash
docker exec --workdir /opt/kafka/bin/ -it broker sh
````

To create a topic run the following command:
```bash
./kafka-topics.sh --bootstrap-server localhost:9092 --create --topic test-topic
```

To produce a message run the following command:
```bash
./kafka-console-producer.sh --broker-list localhost:9092 --topic test-topic
```

To consume a message run the following command:
```bash
./kafka-console-consumer.sh --bootstrap-server localhost:9092 --topic test-topic
```
