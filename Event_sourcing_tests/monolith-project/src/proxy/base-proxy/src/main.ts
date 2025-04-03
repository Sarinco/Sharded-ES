import express, { Request, Response } from 'express';
import { readFileSync } from 'node:fs';
// For module aliasing
require('module-alias/register');

// Custom imports
import { ProducerFactory } from '@src/handlers/kafkaHandler';
import { ControlPlaneServer } from '@src/control-plane/server';
import { ControlPlaneClient } from '@src/control-plane/client';
import { ConfigManager } from '@src/handlers/configHandler';
import {
    ID_PACKET,
    BROADCAST,
    SHARD,
    ShardRule,
    Event,
} from '@src/control-plane/interfaces';
import { ControlPlane } from './control-plane/control-plane';




//Connection variables setup
const EVENT_ADDRESS = process.env.EVENT_ADDRESS;
const EVENT_PORT = process.env.EVENT_PORT;
const EVENT_CLIENT_ID = process.env.EVENT_CLIENT_ID;
const REGION = process.env.REGION || 'no_region';

if (!EVENT_ADDRESS || !EVENT_PORT || !EVENT_CLIENT_ID) {
    console.log('Please provide the event address, port and client id');
    process.exit(1);
}

const MASTER = process.env.MASTER || 'proxy-1';
const CONTROL_PORT = parseInt(process.env.CONTROL_PORT as string) || 6000;
const IS_MASTER = process.env.IS_MASTER || 'false';

// Gateway 
const GATEWAY_ADDRESS = process.env.GATEWAY_ADDRESS;
const GATEWAY_PORT = process.env.GATEWAY_PORT;
const GATEWAY = `http://${GATEWAY_ADDRESS}:${GATEWAY_PORT}`;

let config_manager: ConfigManager;
let control_plane: ControlPlane;

function parseCsv() {
    const csv_file = readFileSync('./src/sharder/filters.csv', 'utf-8');
    let raw_filters = csv_file.split("\n");
    let filters: string[][] = [];
    for (var i = 1; i < raw_filters.length; i++) {
        filters.push(raw_filters[i].split(";"));
    }
    return filters
}
// CONTROL PLANE

// CONTROL PLANE SERVER
if (IS_MASTER == "true") {
    const config = readFileSync('./src/config.json', 'utf-8');
    let filters: string[][] = parseCsv();
    const controlPlaneServer = new ControlPlaneServer(CONTROL_PORT, config, REGION, filters);
    control_plane = controlPlaneServer;
    // Start server
    controlPlaneServer.start().catch((error: any) => {
        console.log('Error starting the Control Plane server: ', error);
    }).then(() => {
        controlPlaneServer.onConnection()
        config_manager = controlPlaneServer.config_manager;
    });
} else {
    // CONTROL PLANE CLIENT
    const control_plane_client = new ControlPlaneClient(MASTER, CONTROL_PORT, REGION);
    control_plane = control_plane_client;

    // Connect to the server
    const seconds = 1;
    setTimeout(() => {
        control_plane_client.connect().catch((error: any) => {
            console.log('Error connecting to the Control Plane server: ', error);
        }).then(() => {
            config_manager = control_plane_client.config_manager;

            // Send the ID packet to the server
            const id_packet: Buffer = Buffer.from(JSON.stringify({ region: REGION }));
            control_plane_client.sendControl(id_packet, ID_PACKET);
        });
    }, seconds * 1000);
}

// PRODUCER
const producer = new ProducerFactory(EVENT_CLIENT_ID, [`${EVENT_ADDRESS}:${EVENT_PORT}`]);
producer.start().then(() => {
    console.log("Producer started successfully");
}).catch((error: any) => {
    console.log("Error starting the producer: ", error);
});

const app = express();
const PORT: number = parseInt(process.env.PORT as string);

// Middleware to parse JSON bodies
app.use(express.json());

// For health check
app.get('/health', (_req: Request, res: Response) => {
    res.status(200).send('Server is running');
});


// Logging all the requests made to the server
app.post('/', (req: Request, res: Response) => {
    const body = req.body;
    console.log('Received request: ', body);

    const { topic, message } = body;

    const event: Event = body;
    const routing_instructions = config_manager.matchRule(event);
    console.log('Rule: ', routing_instructions);

    switch (routing_instructions.action) {
        case BROADCAST:
            producer.send(topic, message).then(() => {
                control_plane.broadcast(JSON.stringify(event));
                res.status(200).send('Message broadcasted');
            }).catch((error: any) => {
                console.log('Error broadcasting the message: ', error);
                res.status(500).send('Error broadcasting the message');
            });
            break;

        case SHARD:
            // Cast the routing instructions to NewShardRule
            const new_shard_rule: ShardRule = {
                action: routing_instructions.action,
                topic: event.topic,
                region: routing_instructions.region || []
            };
            const region = new_shard_rule.region;
            if (!region) {
                console.log('Error getting the region');
                res.status(500).send('Error getting the region');
                return;
            }
            const index = region.indexOf(REGION);
            let include_myself = index != -1;

            if (include_myself) {
                producer.send(topic, message).then(() => {
                    console.log('Message sent to my region');
                }).catch((error: any) => {
                    console.log('Error sending the message to the correct region: ', error);
                    res.status(500).send('Error sending the message to the correct region');
                });
                region.splice(index, 1);
            }

            // Forward the message to the correct region
            let responses = control_plane.sendToRegion(JSON.stringify(event), region);
            console.log('Responses: ', responses);
            Promise.all(responses).then(() => {
                res.status(200).send('Message forwarded to all regions');
            }).catch((error: any) => {
                console.log('Error forwarding the message to all regions: ', error);
                res.status(500).send('Error forwarding the message to all regions');
            });
            break;
        default:
            res.status(500).send('Error not implemented');
            break;
    }

});

app.post('/direct-forward', (req: Request, res: Response) => {
    const body = req.body;
    console.log('Received request: ', body);
    const { topic, message } = body;

    producer.send(topic, message).then(() => {
        console.log('Message forwarded');
        res.status(200).send('Message forwarded');
    }).catch((error: any) => {
        console.log('Error forwarding the message: ', error);
        res.status(500).send('Error forwarding the message');
    });
});


// DEBUG API ENDPOINT

// Get all connected clients
app.get('/connections', (_req: Request, res: Response) => {
    console.log('Getting connections');
    console.log('Connections: ', control_plane.getConnectedconnections());
    const connections: string = JSON.stringify(control_plane.getConnectedconnections());

    console.log('Connections: ', connections);
    res.status(200).send(connections);
});


// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});


