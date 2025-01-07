import cassandra from 'cassandra-driver';


export class Cassandra {
    private client: cassandra.Client;
    private keyspace: string;

    constructor(keyspace: string) {
        this.client = new cassandra.Client({
            contactPoints: ['db-stock'],
            localDataCenter: 'datacenter1',
            keyspace: 'products',
        });
        this.keyspace = keyspace;
    }

    async connect() {
        try {
            await this.client.connect();
            console.log('Connected to Cassandra');
        } catch (err) {
            console.error('Failed to connect to Cassandra', err);
            process.exit(1);
        }
    }

    async insert(table: string, values: string) {
        const query = `INSERT INTO ${this.keyspace}.${table} VALUES '${values}'`;
        try {
            await this.client.execute(query);
            console.log('Inserted data into Cassandra');
        } catch (err) {
            console.error('Failed to insert data into Cassandra', err);
            process.exit(1);
        }
    }

    async shutdown() {
        await this.client.shutdown();
        console.log('Cassandra client disconnected');
    }
}
