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
    CONFIG_PACKET
} from '@src/control-plane/interfaces';

//Connection variables setup
const EVENT_ADDRESS = process.env.EVENT_ADDRESS;
const EVENT_PORT = process.env.EVENT_PORT;
const EVENT_CLIENT_ID = process.env.EVENT_CLIENT_ID;
const REGION = process.env.REGION;

if (!EVENT_ADDRESS || !EVENT_PORT || !EVENT_CLIENT_ID) {
    console.log('Please provide the event address, port and client id');
    process.exit(1);
}

const MASTER = process.env.MASTER || 'proxy-1';
const CONTROL_PORT = parseInt(process.env.CONTROL_PORT as string) || 6000;
const IS_MASTER = process.env.IS_MASTER || 'false';

let config_manager: ConfigManager

// CONTROL PLANE
// Retrive json filters 


// CONTROL PLANE SERVER
if (IS_MASTER == "true") {
    const config = readFileSync('./src/config.json', 'utf-8');
    const controlPlaneServer = new ControlPlaneServer(CONTROL_PORT, config);
    // Start server
    controlPlaneServer.start().catch((error: any) => {
        console.log('Error starting the Control Plane server: ', error);
    }).then(() => {
        controlPlaneServer.onConnection()
        config_manager = controlPlaneServer.config_manager;
    });
} else {
    // CONTROL PLANE CLIENT
    const controlPlaneClient = new ControlPlaneClient(MASTER, CONTROL_PORT);

    // Connect to the server
    const seconds = 1;
    setTimeout(() => {
        controlPlaneClient.connect().catch((error: any) => {
            console.log('Error connecting to the Control Plane server: ', error);
        }).then(() => {
            config_manager = controlPlaneClient.config_manager;
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


    const rule = config_manager.matchRule(body);
    console.log('Rule: ', rule);

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


// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
