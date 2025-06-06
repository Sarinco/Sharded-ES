import express, { Request, Response } from 'express';
import { readFileSync, appendFile, readFile, writeFile} from 'node:fs';
// For module aliasing
require('module-alias/register');

// Custom imports
import { ProducerFactory } from '@src/handlers/kafkaHandler';
import { ControlPlaneServer } from '@src/control-plane/server';
import { ControlPlaneClient } from '@src/control-plane/client';
import { ConfigManager } from '@src/handlers/configHandler';
import {
    ID_PROXY_PACKET,
    BROADCAST,
    SHARD,
    ShardRule,
    Event,
} from '@src/control-plane/interfaces';
import { ControlPlane } from './control-plane/control-plane';
import { overrideConsole } from '@src/helper/console';


// For nice console logs
overrideConsole();


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
    const proxy_config = readFileSync('./src/sharder/proxy_config.json', 'utf-8');
    const gateway_config = readFileSync('./src/sharder/gateway_config.json', 'utf-8');
    let filters: string[][] = parseCsv();
    const controlPlaneServer = new ControlPlaneServer(CONTROL_PORT, proxy_config, gateway_config, REGION, filters);
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
            control_plane_client.sendControl(id_packet, ID_PROXY_PACKET);
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

    const { topic, message } = body;

    const event: Event = body;
    const routing_instructions = config_manager.matchRule(event);
    console.info('Rule: ', routing_instructions);

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

// Filter management API
app.post('/filter', (req: Request, res: Response) => {
    const body = req.body;
    console.log('Received add filter request : ', body);
    let { topic, key, value, target } = body;
    target = target.split(",");

    if (IS_MASTER == "true"){
        // broadcast messages to the others
        console.log("Filter at the master, broadcasting to other proxies...")
        control_plane.broadcast(JSON.stringify(body), "filter");
        console.log("done");
        console.log("adding to csv filter file");
        // add the filter to the csv
        const csv_filter: string = "\n" + topic +";"+ key +";"+ value +";"+ target;
        appendFile("./src/sharder/filters.csv", csv_filter, (err) =>{
            if (err) throw err;
            console.log("Filter added to csv file : ", csv_filter);
        });
        console.log("done");
    }

    config_manager.addFilter([topic, key, value, target]);

    res.status(200).send("Filter added successfully");
})

app.delete('/filter', (req:Request, res:Response) => {
    const body = req.body;
    console.log('Received DELETE filter request : ', body);
    let { topic, key, value } = body;

    //if master, do extra steps
    if (IS_MASTER == "true"){
        // broadcast messages to the others
        console.log("Delete command at the master, broadcasting to other proxies...")
        control_plane.broadcast(JSON.stringify(body), "filter", "DELETE");
        console.log("done");
        // delete the filter from the csv
        //
        readFile("./src/sharder/filters.csv", "utf-8", function (err, data) {
            if (err) throw err;

            let lines = data.split("\n")
            let new_file: string[] = [];
            lines.forEach(line => {
                let parameters = line.split(";");
                if (parameters[0] != topic || parameters[1] != key || parameters[2] != value){
                    new_file.push(line);
                }
            });
            let new_file_string = new_file.join("\n");
            console.log("here's the new csv : \n", new_file_string);
            writeFile("./src/sharder/filters.csv", new_file_string, function (err) {
                if (err) throw err;
            });
        })

    }

    config_manager.deleteFilter([topic, key, value]);

    res.status(200).send("Filter deleted successfully");

})


// DEBUG API ENDPOINT

// Get all connected clients
app.get('/proxy-connections', (_req: Request, res: Response) => {
    console.info('Connections: ', control_plane.getProxyConnections());
    const connections: string = JSON.stringify(control_plane.getProxyConnections());

    res.status(200).send(connections);
});

app.get('/gateway-connections', (_req: Request, res: Response) => {
    console.info('Connections: ', control_plane.getGatewayConnections());
    const connections: string = JSON.stringify(control_plane.getGatewayConnections());

    res.status(200).send(connections);
});

// Start the server
app.listen(PORT, () => {
    console.info(`Server is running on port ${PORT}`);
});


