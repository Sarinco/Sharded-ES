import net from 'net';
import { readFileSync } from 'fs';

import { ConfigManager } from "@src/custom-handler/configHandler";
import {
    RawConfig,
    RawControlPacket,
    CONFIG_PACKET,
    defaultRule,
    NEW_CONNECTION_PACKET
} from '@src/control-plane/interfaces';


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


export class ControlPlaneServer {
    private server: net.Server;
    private port: number;
    public connections: Map<string, net.Socket>;
    private config: RawConfig[];
    public config_manager: ConfigManager

    constructor(port: number, config: string) {
        this.port = port;
        this.server = net.createServer();
        this.connections = new Map();
        this.config = JSON.parse(config);
        this.config_manager = new ConfigManager();
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

            // Close all active client connections
            this.connections.forEach((socket) => socket.destroy());
            this.connections.clear();
        });
    }

    // Handle incoming connections
    onConnection() {
        this.server.on('connection', (socket) => {
            const remote_address = getSimpleIPAddress(socket.remoteAddress);
            const clientId = `${remote_address}:${socket.remotePort}`;
            console.log(`New client connected: ${clientId}`);

            this.onConnectionFunction(socket, clientId);

            // Store the socket in the connections map
            this.connections.set(clientId, socket);

            // Attach event listeners to the socket
            socket.on('data', (data) => {
                this.onDataFunction(data, clientId);
            });

            socket.on('close', () => {
                console.log(`Client disconnected: ${clientId}`);
                this.connections.delete(clientId);
                this.onCloseFunction(clientId);
            });

            socket.on('timeout', () => {
                console.log(`Client timed out: ${clientId}`);
                this.connections.delete(clientId);
                this.onTimeoutFunction(clientId);
            });

            socket.on('error', (err) => {
                console.log(`Client error: ${clientId}`);
                this.connections.delete(clientId);
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
        let known_ips = Array.from(this.connections.keys());
        known_ips = known_ips.map((key) => {
            return key.split(":")[0];
        });
        //adds own ip to the list
        known_ips.push(ip_address);

        let packet: RawControlPacket = {
            type: NEW_CONNECTION_PACKET,
            data: known_ips
        };


        socket.write(JSON.stringify(packet) + "%end%");

        // Send config to the client
        packet = {
            type: CONFIG_PACKET,
            data: this.config
        };

        socket.write(JSON.stringify(packet) + "%end%");


        // Add client to active connections
        this.connections.set(clientId, socket);
    }

    onDataFunction(data: Buffer, clientId: string) {
        const data_json = JSON.parse(data.toString());
        console.log("coucou");
        switch (data_json.type) {
            default:
                console.log('Unknown packet type');
        }

    }

    onTimeoutFunction(clientId: string) {
    }

    onErrorFunction(err: Error, clientId: string) {
        console.error(`Error with client ${clientId}:`, err);
    }

    onCloseFunction(clientId: string) {
    }

    // Broadcast a message to all connected connections
    broadcast(message: string, excludeClientId?: string) {
        this.connections.forEach((socket, clientId) => {
            if (clientId !== excludeClientId) {
                socket.write(message);
            }
        });
    }

    // Send a message to a specific client
    sendToClient(clientId: string, message: string) {
        const socket = this.connections.get(clientId);
        if (socket) {
            socket.write(message);
        } else {
            console.error(`Client ${clientId} not found`);
        }
    }

    // Get all connected client IDs
    getConnectedconnections(): string[] {
        return Array.from(this.connections.keys());
    }
}
