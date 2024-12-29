import cassandra from 'cassandra-driver';


export class Cassandra {
    private client: cassandra.Client;

    constructor() {
        this.client = new cassandra.Client({
            contactPoints: ['db-stock'],
            localDataCenter: 'datacenter1',
            keyspace: 'products',
        });
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

    async ensureKeyspace() {
        const query = `CREATE KEYSPACE IF NOT EXISTS products WITH replication = {'class': 'SimpleStrategy', 'replication_factor': 1}`;
        try {
            await this.client.execute(query);
            console.log('Keyspace "products" is ready');
        } catch (err) {
            console.error('Failed to create keyspace "products"', err);
            process.exit(1);
        }
    }

    async shutdown() {
        await this.client.shutdown();
        console.log('Cassandra client disconnected');
    }
}
