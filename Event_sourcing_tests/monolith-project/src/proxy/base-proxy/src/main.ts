import express, { Request, Response } from 'express';
import { readFileSync } from 'node:fs';
// For module aliasing
require('module-alias/register');

// Custom imports
import { ProducerFactory } from '@src/handlers/kafkaHandler';
import { ControlPlaneServer } from '@src/control-plane/server';
import { ControlPlaneClient } from '@src/control-plane/client';
import { ConfigManager } from '@src/custom-handler/configHandler';
import {
    ID_PACKET,
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

let config_manager: ConfigManager;
let control_plane: ControlPlane;


// CONTROL PLANE

// CONTROL PLANE SERVER
if (IS_MASTER == "true") {
    const config = readFileSync('./src/config.json', 'utf-8');
    const controlPlaneServer = new ControlPlaneServer(CONTROL_PORT, config, REGION);
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
            control_plane_client.send(id_packet, ID_PACKET);
        });
    }, seconds * 1000);
}

// PRODUCER
const producer = new ProducerFactory(EVENT_CLIENT_ID, [`${EVENT_ADDRESS}:${EVENT_PORT}`]);
// producer.start().then(() => {
//     console.log("Producer started successfully");
// }).catch((error: any) => {
//     console.log("Error starting the producer: ", error);
// });

const app = express();
const PORT: number = parseInt(process.env.PORT as string);

// Middleware to parse JSON bodies
app.use(express.json());

// For health check
app.get('/', (req: Request, res: Response) => {
    res.status(200).send('Server is running');
});


// Logging all the requests made to the server
app.post('/', (req: Request, res: Response) => {
    const body = req.body;
    console.log('Received request: ', body);
    const { topic, message } = body;

    console.log('Message: ', message);


    const routing_instructions = config_manager.matchRule(body);
    console.log('Rule: ', routing_instructions);

    if (routing_instructions.action == 'broadcast') {
        // TODO : send the message to everyone

        // remarque : Yo max, l'implémentation ci-dessous est incomplète et j'aimerais
        // bien la discuter avec toi, kiss kiss

        let connections = control_plane.connections
        connections.forEach((socket: any, key: string) => {
            socket.write(JSON.stringify(body) + "%end%");
        });
    }

    if (routing_instructions.action == 'shard') {
        // TODO : send the message to the specified region
    }

    res.status(500).send('Error not implemented');


    // if (region == REGION) {
    //     producer.send(topic, message).then(() => {
    //         console.log('Message forwarded');
    //         res.status(200).send('Message forwarded');
    //     }).catch((error: any) => {
    //         console.log('Error forwarding the message: ', error);
    //         res.status(500).send('Error forwarding the message');
    //     });
    // } else {
    //     // Send to other region 
    //     console.log('Forwarding the message to ', region);
    //
    //     // let targetRegion = region == 'site1' ? 'proxy-1' : 'proxy-2';
    //     let targetRegions = config_manager.matchFilter({ topic: topic, region: region, message: message });
    //     console.log('Target region: ', targetRegions);
    //
    //     if (targetRegions.length == 0) {
    //         console.log('No target region found');
    //         res.status(500).send('No target region found');
    //         return;
    //     }
    //
    //     targetRegions.forEach((targetRegion) => {
    //         fetch(`http://${targetRegion}/direct-forward`, {
    //             method: 'POST',
    //             headers: {
    //                 'Content-Type': 'application/json'
    //             },
    //             body: JSON.stringify(body)
    //         }).then(() => {
    //             console.log('Event sent successfully to ', region);
    //         }).catch((error: any) => {
    //             console.log('Error forwarding the message: ', error);
    //             res.status(500).send('Error forwarding the message');
    //             return;
    //         });
    //     });
    //     res.status(200).send('Message forwarded');
    // }

});

app.post('/direct-forward', (req: Request, res: Response) => {
    const body = req.body;
    console.log('Received request: ', body);
    const { topic, region, message } = body;

    console.log('Received message for this region: ', region);
    console.log('Message: ', message);

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
app.get('/connections', (req: Request, res: Response) => {
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
