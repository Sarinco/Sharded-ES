import net from 'net';
import { readFileSync } from 'fs';

import { ConfigManager } from "@src/custom-handler/configHandler";
import {
    RawConfig,
    RawControlPacket,
    CONFIG_PACKET,
    NEW_CONNECTION_PACKET,
    ID_PACKET,
    LOST_CONNECTION_PACKET,
    defaultRule,
    NewConnectionPacket,
} from '@src/control-plane/interfaces';
import {
    ControlPlane
} from '@src/control-plane/control-plane';


function getSimpleIPAddress(remote_address: string | undefined): string | null {
    if (!remote_address) {
        return null;
    }

    // Check if the address is an IPv4 address mapped to IPv6
    if (remote_address.startsWith('::ffff:')) {
        return remote_address.substring(7); // Remove the '::ffff:' prefix
    }

    return remote_address; // Return the original address if it's IPv6 or already simple
}


export class ControlPlaneServer extends ControlPlane {
    private server: net.Server;
    private port: number;
    private config: RawConfig[];
    private sockets: Map<string, net.Socket>;

    constructor(port: number, config: string, region: string) {
        super(region);
        this.port = port;
        this.server = net.createServer();
        this.config = JSON.parse(config);
        this.sockets = new Map();
    }

    configFilters() {
        for (const conf of this.config) {
            switch (conf.action) {
                case 'shard':
                    // Read the file specify in rule
                    const file = conf.rules;
                    if (!file) {
                        console.log('No file specified');
                        break;
                    }
                    // list current directory
                    const new_rules = readFileSync(file, 'utf-8');
                    conf.rules = new_rules;
                    break;
                case 'broadcast':
                    conf.rules = defaultRule.toString();
                    break;
                default:
                    console.log('Unknown action');
            }
        }
    }

    // Start the server
    start(): Promise<void> {
        this.configFilters();
        console.log("Config: ", this.config);


        return new Promise((resolve, reject) => {
            this.server.listen(this.port, () => {
                console.log(`Control Plane server started on port ${this.port}`);
                resolve();
            });

            this.server.on('error', (err) => {
                reject(err);
            });
        });
    }

    // Stop the server
    stop(): Promise<void> {
        return new Promise((resolve, reject) => {
            this.server.close(() => {
                console.log('Control Plane server stopped');
                resolve();
            });

            // Close all active client sockets
            this.sockets.forEach((socket) => socket.destroy());
            this.sockets.clear();
        });
    }

    // Handle incoming sockets
    onConnection() {
        this.server.on('connection', (socket) => {
            const remote_address = getSimpleIPAddress(socket.remoteAddress);
            if (!remote_address) {
                console.log('Error getting the remote address');
                return;
            }
            const clientId = `${remote_address}:${socket.remotePort}`;
            console.log(`New client connected: ${clientId}`);

            this.onConnectionFunction(socket, clientId);

            // Store the socket in the sockets map
            this.sockets.set(clientId, socket);

            // Attach event listeners to the socket
            socket.on('data', (data) => {
                this.onDataFunction(data, clientId);
            });

            socket.on('close', () => {
                this.onCloseFunction(clientId);
            });

            socket.on('timeout', () => {
                this.onTimeoutFunction(clientId);
            });

            socket.on('error', (err) => {
                this.onErrorFunction(err, clientId);
            });
        });
    }

    onConnectionFunction(socket: net.Socket, clientId: string) {
        // Send filter to the client
        const ip_address = getSimpleIPAddress(socket.localAddress);
        const port = socket.remotePort;
        if (!ip_address || !port) {
            console.log('Error getting the IP address or port');
            return;
        }

        //send known ip's to the client 
        let data: NewConnectionPacket[] = this.getConnectedconnections();
        console.log("Data: ", data);
        let ips = this.connections.get(this.region);
        if (ips) {
            ips.push(ip_address)
            data.push({
                region: this.region,
                ip: ips
            });
        } else {
            data.push({
                region: this.region,
                ip: [ip_address]
            });
        }

        let packet: RawControlPacket = {
            type: NEW_CONNECTION_PACKET,
            data: data
        };


        socket.write(JSON.stringify(packet) + "%end%");

        // Send config to the client
        packet = {
            type: CONFIG_PACKET,
            data: this.config
        };

        socket.write(JSON.stringify(packet) + "%end%");


        // Add client to active sockets
        this.sockets.set(clientId, socket);
    }

    onDataFunction(data: Buffer, clientId: string) {
        let full_data = this.socket_buffer + data.toString();
        let split_queries = full_data.split("%end%");

        if (split_queries.length < 2) {
            console.log("Data not complete");
            this.socket_buffer = full_data;
            return;
        }
        const own_ip = getSimpleIPAddress(this.sockets.get(clientId)?.localAddress);
        if (!own_ip) {
            console.log('Error getting the own IP address');
            return;
        }

        for (let i = 0; i < split_queries.length - 1; i++) {
            console.log("Full data packet received: ", split_queries[i]);
            const data_json = JSON.parse(split_queries[i]);
            switch (data_json.type) {
                case ID_PACKET:
                    const ip_address = clientId.split(':')[0];
                    const region = data_json.data.region;

                    this.addConnection(region, ip_address);

                    // Broadcast the new connection to all clients
                    let connection_data: NewConnectionPacket[] = [{
                        region: region,
                        ip: [ip_address]
                    }];

                    const packet: RawControlPacket = {
                        type: NEW_CONNECTION_PACKET,
                        data: connection_data 
                    };

                    console.log("Packet: ", packet);
                    this.controlBroadcast(JSON.stringify(packet), clientId);
                    break;
                default:
                    console.log('Unknown packet type');
            }
        }
        this.socket_buffer = split_queries[split_queries.length - 1];
    }

    shutdownConnection(clientId: string) {
        const packet: RawControlPacket = {
            type: LOST_CONNECTION_PACKET,
            data: {
                ip: clientId.split(':')[0]
            }
        };
        this.controlBroadcast(JSON.stringify(packet), clientId);
        console.log(`removal packet for client ${clientId} broadcasted`);

    }

    onTimeoutFunction(clientId: string) {
        console.log(`Client timed out: ${clientId}`);
        this.sockets.delete(clientId);
        this.shutdownConnection(clientId);
        this.removeConnection(clientId.split(':')[0]);
    }

    onErrorFunction(err: Error, clientId: string) {
        console.log(`Error on client ${clientId}: ${err.message}`);
        this.sockets.delete(clientId);
        this.shutdownConnection(clientId);
        this.removeConnection(clientId.split(':')[0]);
    }

    onCloseFunction(clientId: string) {
        console.log(`Client disconnected: ${clientId}`);
        this.sockets.delete(clientId);
        this.shutdownConnection(clientId);
        this.removeConnection(clientId.split(':')[0]);
    }

    controlBroadcast(message: string, excludeClientId?: string) {
        this.sockets.forEach((socket, key) => {
            if (key !== excludeClientId) {
                socket.write(message + "%end%");
            }
        });
    }
}
