import { EventStoreDBClient, jsonEvent, FORWARDS, START, JSONEventType } from "@eventstore/db-client";
import { v4 as uuid } from 'uuid';

// Create a client connected to your local EventStoreDB instance
const client = EventStoreDBClient.connectionString("esdb://localhost:2113?tls=false");
type TestEvent = JSONEventType<
    "TestEvent",
    {
        entityId: string;
        importantData: string;
    }
>;

const event = jsonEvent<TestEvent>({
    type: "TestEvent",
    data: {
        entityId: uuid(),
        importantData: "I wrote my first event!",
    },
});


async function main() {
    // Create a stream name
    await client.appendToStream("test-stream", event);
    
    /*
     * direction of the read
     * fromRevision: START, END, or a specific revision -> BigInt
     * maxCount: number of events to read
     *
     */
    const events = client.readStream<TestEvent>("test-stream", {
        direction: FORWARDS,
        fromRevision: START,
        maxCount: 10,
    });

    for await (const resolvedEvent of events) {
        console.log(resolvedEvent.event?.data);
    }
}


main().catch((err) => console.error(err));
