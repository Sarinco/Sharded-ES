import net from 'net';

import { replaceAddress, FilterManager } from "@src/custom-handler/filterHandler";
import {
    Filter,
    RawControlPacket,
    AddFilterPacket,
    RemoveFilterPacket,
    ADD_FILTER,
    REMOVE_FILTER
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
    private connections: Map<string, net.Socket>;
    private own_filter: Array<Filter>;
    public filter_manager: FilterManager

    constructor(port: number, own_filter: string) {
        this.port = port;
        this.server = net.createServer();
        this.connections = new Map();
        this.own_filter = JSON.parse(own_filter);
        this.filter_manager = new FilterManager();
    }

    // Start the server
    start(): Promise<void> {
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
        console.log("My IP address: ", ip_address);
        const modified_filter = replaceAddress(this.own_filter, ip_address)

        // Send all filters to the client
        const all_current_filters: IterableIterator<Filter> = this.filter_manager.getAllFilters();
        const filters: Filter[] = [ ...modified_filter ];
        for (const filter of all_current_filters) {
            filters.push(filter);
        }
        const packet = {
            type: ADD_FILTER,
            data: filters
        };
        const result = socket.write(JSON.stringify(packet));
        if (!result) {
            console.log('Error sending the filter to the client');
        }

        // Add client to active connections
        this.connections.set(clientId, socket);
    }

    onDataFunction(data: Buffer, clientId: string) {
        const data_json = JSON.parse(data.toString());
        switch (data_json.type) {
            case ADD_FILTER:
                const ip_address = getSimpleIPAddress(this.connections.get(clientId)?.remoteAddress);
                if (!ip_address) {
                    console.log('Error getting the IP address');
                    return;
                }
                const filters: Filter[] = data_json.data;
                const parsed_filter = replaceAddress(filters, ip_address);
                console.log('Received filters:', parsed_filter);
                this.filter_manager.addFilter(parsed_filter);

                // Broadcast the message to all connected connections
                const packet: RawControlPacket = {
                    type: ADD_FILTER,
                    data: parsed_filter
                };
                this.broadcast(JSON.stringify(packet), clientId);
                break;
            case REMOVE_FILTER:
                break;
            default:
                console.log('Unknown packet type');
        }

    }

    onTimeoutFunction(clientId: string) {
        this.cleanFilter(clientId);
    }

    onErrorFunction(err: Error, clientId: string) {
        console.error(`Error with client ${clientId}:`, err);
        this.cleanFilter(clientId);
    }

    onCloseFunction(clientId: string) {
        this.cleanFilter(clientId);
    }

    private cleanFilter(clientId: string) {
        const ip_address = clientId.split(':')[0];
        if (!ip_address) {
            console.log('Error getting the IP address');
            return;
        }
        this.filter_manager.removeFiltersByProxyAddress(ip_address);

        // Broadcast the message to all connected connections
        const packet: RawControlPacket = {
            type: REMOVE_FILTER,
            data: ip_address
        };
        this.broadcast(JSON.stringify(packet), clientId);
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
