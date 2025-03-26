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

// Forwards the message to the gateway and returns the response
app.post('/gateway-forward', (req: Request, res: Response) => {
    if (GATEWAY_PORT == undefined || GATEWAY_ADDRESS == undefined) {
        console.log('Please provide the gateway address and port sending empty array');
        res.status(200).json([]);
        return;
    }

    let { path, auth } = req.body;
    // Remove the first / from the path
    // Add the query parameters ask_proxy=no
    let url = new URL(GATEWAY + path);
    url.searchParams.append('ask_proxy', 'no');
    path = url.pathname + url.search;
    path = path.substring(1);

    console.log(`Forwarding the message to the gateway: ${url.toString()}`);

    fetch(url.toString(), {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            'authorization': auth,
        },
    }).then((response) => {
        if (response.status !== 200) {
            console.log(`Response: ${response}`);
            console.log('Error forwarding the message to the gateway');
            res.status(500).send('Error forwarding the message to the gateway');
            return;
        }
        response.json().then((data) => {
            console.log('Response from the gateway: ', data);
            res.status(200).json(data);
        });
    }).catch((error: any) => {
        console.log('Error forwarding the message to the gateway: ', error);
        res.status(500).send('Error forwarding the message to the gateway');
    });
});

// Logging all the requests made to the server
app.post('/', (req: Request, res: Response) => {
    const body = req.body;
    console.log('Received request: ', body);

    const { topic, message } = body;

    const event: Event = body;
    const routing_instructions = config_manager.matchRule(event);
    console.log('Rule: ', routing_instructions);

    const value = JSON.parse(message.value);
    const is_cqrs = value.path != undefined;
    let path = '';
    let auth = '';
    let ask_all = routing_instructions.ask_all == undefined ? false : routing_instructions.ask_all;
    if (is_cqrs) {
        console.log('CQRS message');
        path = value.path;
        auth = value.auth;
    }

    switch (routing_instructions.action) {
        case BROADCAST:
            if (is_cqrs) {
                // Send the message to own gateway
                let url = new URL(GATEWAY + path);
                url.searchParams.append('ask_proxy', 'no');
                path = url.pathname + url.search;
                path = path.substring(1);
                fetch(url.toString(), {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json',
                        'authorization': auth
                    },
                }).then((response) => {
                    console.log('Response from the gateway: ', response);
                    if (response.status !== 200) {
                        console.log('Error forwarding the message to the gateway');
                        res.status(response.status).send('Error forwarding the message to the gateway');
                        return;
                    }
                    response.json().then((data) => {
                        res.status(200).send(data);
                    });
                }).catch((error: any) => {
                    console.log('Error forwarding the message to the gateway: ', error);
                    res.status(500).send('Error forwarding the message to the gateway');
                });
                return;
            }

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

            if (include_myself && !is_cqrs) {
                producer.send(topic, message).then(() => {
                    console.log('Message sent to my region');
                }).catch((error: any) => {
                    console.log('Error sending the message to the correct region: ', error);
                    res.status(500).send('Error sending the message to the correct region');
                });
                region.splice(index, 1);
            }

            // If the message is a CQRS message, forward it to all the other regions 
            // at the /gateway-forward endpoint
            if (is_cqrs) {
                // Forward the message to the gateway
                let request = {
                    path,
                    auth
                }
                let promises;
                if (ask_all) {
                    console.log('Asking all');
                    promises = control_plane.sendToAllRegionsWithEndpoint(JSON.stringify(request), 'gateway-forward');
                    include_myself = true;
                } else {
                    promises = control_plane.sendToRegionWithEndpoint(JSON.stringify(request), region, 'gateway-forward');
                }

                if (include_myself) {
                    console.log('Including myself');
                    let url = new URL(GATEWAY + path);
                    url.searchParams.append('ask_proxy', 'no');
                    path = url.pathname + url.search;
                    path = path.substring(1);
                    promises.push(fetch(url.toString(), {
                        method: 'GET',
                        headers: {
                            'Content-Type': 'application/json',
                            'authorization': auth
                        },
                    }));
                }

                Promise.all(promises).then(async (responses) => {
                    let data = await Promise.all(responses.map((response) => response.json()));
                    // If data is an array of arrays, flatten it
                    if (data.length > 0 && data[0].length > 0) {
                        data = data.flat();
                    }
                    // INFO: If the data has id field, it will be merged

                    // Create a map to store all objects by id
                    const mergedMap = new Map();

                    // Helper function to merge two objects
                    const mergeObjects = (obj1: any, obj2: any) => {
                        const result = { ...obj1 };
                        for (const key of Object.keys(obj2)) {
                            if (Array.isArray(result[key]) && Array.isArray(obj2[key])) {
                                // If both properties are arrays, concatenate them
                                result[key] = [...result[key], ...obj2[key]];
                            } else if (typeof result[key] === 'object' && typeof obj2[key] === 'object') {
                                // If both properties are objects, merge them recursively
                                result[key] = mergeObjects(result[key], obj2[key]);
                            } else {
                                // Otherwise, overwrite the property
                                result[key] = obj2[key];
                            }
                        }
                        return result;
                    };

                    // Iterate through all objects and merge them
                    data.forEach((item) => {
                        if (item.id !== undefined) {
                            const existingItem = mergedMap.get(item.id);

                            if (existingItem) {
                                // Merge the existing item with the new one
                                mergedMap.set(item.id, mergeObjects(existingItem, item));
                            } else {
                                // Add the new item to the map
                                mergedMap.set(item.id, item);
                            }
                        } else {
                            // If the item doesn't have an id, add it to the map with a unique key
                            const uniqueKey = `no-id-${mergedMap.size}`;
                            mergedMap.set(uniqueKey, item);
                        }
                    });

                    // Convert the map back to an array
                    const combinedData = Array.from(mergedMap.values());

                    console.log('Combined Data (FULL OUTER JOIN): ', combinedData);
                    res.status(200).send(combinedData);
                }).catch((error: any) => {
                    console.log('Error forwarding the message to all regions: ', error);
                    res.status(500).send('Error forwarding the message to all regions');
                });
                return;
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
