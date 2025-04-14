import net from 'net';
import { readFileSync } from 'fs';

import { ConfigManager } from "@src/handlers/configHandler";
import {
    Config,
    RawControlPacket,
    CONFIG_PACKET,
    NEW_FILTER_PACKET,
    NEW_PROXY_CONNECTION_PACKET,
    LOST_PROXY_CONNECTION_PACKET,
    NEW_GATEWAY_CONNECTION_PACKET,
    LOST_GATEWAY_CONNECTION_PACKET,
    ID_PROXY_PACKET,
    ID_GATEWAY_PACKET,
    SHARD,
    BROADCAST,
    defaultRule,
    NewConnectionPacket,
    defaultConfig
} from '@src/control-plane/interfaces';
import {
    ControlPlane
} from '@src/control-plane/control-plane';


const REGION = process.env.REGION || 'no_region';

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
    private proxy_config: Config[];
    private gateway_config: Config[];

    private sockets: Map<string, net.Socket>;
    private filters: string[][];

    /**
      * @constructor Creates a new ControlPlane Server instance
      * @param {number} port - The port number to listen on
      * @param {string} config - JSON string containing raw configuration data
      * @param {string} region - The region identifier for this server
      * @param {string[][]} filters - Two-dimensional array of network filters
      */
    constructor(port: number, proxy_config: string, gateway_proxy: string, region: string, filters: string[][]) {
        super(region);
        this.port = port;
        this.server = net.createServer();
        this.proxy_config = this.configExtractor(JSON.parse(proxy_config));
        this.gateway_config = this.configExtractor(JSON.parse(gateway_proxy));
        this.sockets = new Map();
        this.filters = filters;
    }

    /**
     * Starts the control plane server and initializes configuration
     * @returns {Promise<void>} Resolves when server starts successfully, rejects on error
     * @throws {Error} If server fails to start
     */
    start(): Promise<void> {
        this.config_manager.setConfig(this.proxy_config, this.filters);

        return new Promise((resolve, reject) => {
            this.server.listen(this.port, () => {
                console.info(`Control Plane server started on port ${this.port}`);
                resolve();
            });

            this.server.on('error', (err) => {
                reject(err);
            });
        });
    }

    /**
     * Stops the control plane server and cleans up resources
     * @returns {Promise<void>} Resolves when server stops successfully
     */
    stop(): Promise<void> {
        return new Promise((resolve, reject) => {
            this.server.close(() => {
                console.info('Control Plane server stopped');
                resolve();
            });

            // Close all active client sockets
            this.sockets.forEach((socket) => socket.destroy());
            this.sockets.clear();
        });
    }

    /**
     * Handles new incoming connections and sets up client event listeners
     * @listens net.Server#connection
     */
    onConnection() {
        this.server.on('connection', (socket) => {
            const remote_address = getSimpleIPAddress(socket.remoteAddress);
            if (!remote_address) {
                console.error('Error getting the remote address');
                return;
            }
            const clientId = `${remote_address}:${socket.remotePort}`;
            console.info(`New client connected: ${clientId}`);

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

    /**
     * Handles initial connection setup for new clients
     * @param {net.Socket} socket - The connected socket object
     * @param {string} clientId - Unique client identifier (IP:PORT format)
     * @sends NEW_PROXY_CONNECTION_PACKET, NEW_GATEWAY_CONNECTION_PACKET, CONFIG_PACKET, and NEW_FILTER_PACKET
     */
    onConnectionFunction(socket: net.Socket, clientId: string) {
        // Send filter to the client
        const ip_address = getSimpleIPAddress(socket.localAddress);
        const port = socket.remotePort;
        if (!ip_address || !port) {
            console.error('Error getting the IP address or port');
            return;
        }

        // Add client to active sockets
        this.sockets.set(clientId, socket);
    }

    /**
     * Processes incoming data from client connections
     * @param {Buffer} data - Raw received data buffer
     * @param {string} clientId - Unique identifier of sending client
     * @emits ID_PROXY_PACKET | ID_GATEWAY_PACKET handling
     */
    onDataFunction(data: Buffer, clientId: string) {
        let full_data = this.socket_buffer + data.toString();
        let split_queries = full_data.split("%end%");

        if (split_queries.length < 2) {
            console.error("Data not complete");
            this.socket_buffer = full_data;
            return;
        }
        const own_ip = getSimpleIPAddress(this.sockets.get(clientId)?.localAddress);
        if (!own_ip) {
            console.error('Error getting the own IP address');
            return;
        }

        for (let i = 0; i < split_queries.length - 1; i++) {
            console.debug("Full data packet received: ", split_queries[i]);
            const data_json = JSON.parse(split_queries[i]);

            this.parentDataFunction(data_json);
            switch (data_json.type) {
                case ID_PROXY_PACKET: {
                    const ip_address = clientId.split(':')[0];
                    const region = data_json.data.region;

                    // Send known proxy ip's to the client
                    let data = this.getProxyConnections();
                    let packet: RawControlPacket = {
                        type: NEW_PROXY_CONNECTION_PACKET,
                        data: data
                    };
                    let socket = this.sockets.get(clientId);
                    if (!socket) {
                        console.error('Error getting the socket');
                        return;
                    }
                    socket.write(JSON.stringify(packet) + "%end%");


                    packet = {
                        type: NEW_PROXY_CONNECTION_PACKET,
                        data: [{
                            region: REGION,
                            ip: [own_ip]
                        }]
                    };
                    socket.write(JSON.stringify(packet) + "%end%");

                    this.addProxyConnection(region, ip_address);

                    // Send config to the client
                    packet = {
                        type: CONFIG_PACKET,
                        data: this.proxy_config
                    };


                    if (!socket) {
                        console.error('Error getting the socket');
                        return;
                    }
                    socket.write(JSON.stringify(packet) + "%end%");

                    // send filter to the client
                    this.filters.forEach(filter => {
                        packet = {
                            type: NEW_FILTER_PACKET,
                            data: filter
                        };

                        socket.write(JSON.stringify(packet) + "%end%");
                    });

                    // Broadcast the new connection to all clients
                    let connection_data: NewConnectionPacket[] = [{
                        region: region,
                        ip: [ip_address]
                    }];

                    packet = {
                        type: NEW_PROXY_CONNECTION_PACKET,
                        data: connection_data
                    };

                    this.controlBroadcast(JSON.stringify(packet), clientId);
                    break;
                }
                case ID_GATEWAY_PACKET: {
                    const ip_address = clientId.split(':')[0];
                    const region = data_json.data.region;

                    this.addGatewayConnection(region, ip_address);

                    // Send config to the client
                    let packet: RawControlPacket = {
                        type: CONFIG_PACKET,
                        data: this.gateway_config
                    };

                    let socket = this.sockets.get(clientId);
                    if (!socket) {
                        console.error('Error getting the socket');
                        return;
                    }
                    socket.write(JSON.stringify(packet) + "%end%");

                    // Send known gateway ip's to the client
                    let data = this.getGatewayConnections();
                    
                    packet = {
                        type: NEW_GATEWAY_CONNECTION_PACKET,
                        data: data
                    };
                    socket.write(JSON.stringify(packet) + "%end%");

                    // send filter to the client
                    this.filters.forEach(filter => {
                        packet = {
                            type: NEW_FILTER_PACKET,
                            data: filter
                        };

                        socket.write(JSON.stringify(packet) + "%end%");
                    });

                    // Broadcast the new connection to all clients
                    let connection_data: NewConnectionPacket[] = [{
                        region: region,
                        ip: [ip_address]
                    }];

                    packet = {
                        type: NEW_GATEWAY_CONNECTION_PACKET,
                        data: connection_data
                    };

                    this.controlBroadcast(JSON.stringify(packet), clientId);
                    break;
                }
                default:
                    console.warn('Unknown packet type');
            }
        }
        this.socket_buffer = split_queries[split_queries.length - 1];
    }

    /**
     * Handles client connection closure cleanup
     * @param {string} clientId - Unique identifier of disconnected client
     * @emits LOST_GATEWAY_CONNECTION_PACKET | LOST_PROXY_CONNECTION_PACKET
     */
    shutdownConnection(clientId: string) {
        let packet: RawControlPacket = {
            type: "not_defined",
            data: {
                ip: clientId.split(':')[0]
            }
        };
        let region = this.ip_region.get(clientId.split(':')[0]);
        if (!region) {
            console.error('Error getting the region');
            return;
        }
        let ip_in_region = this.gateway_connections.get(region);
        console.debug(`IP in region: ${ip_in_region}`);
        console.debug(`Gateway connections:`);
        console.debug(this.getGatewayConnections());
        if (ip_in_region && ip_in_region.includes(clientId.split(':')[0])) {
            console.info(`Removing gateway client ${clientId}`);
            packet.type = LOST_GATEWAY_CONNECTION_PACKET;
            this.removeGatewayConnection(clientId.split(':')[0]);
        } else {
            console.info(`Removing proxy client ${clientId}`);
            packet.type = LOST_PROXY_CONNECTION_PACKET;
            this.removeProxyConnection(clientId.split(':')[0]);
        }
        this.controlBroadcast(JSON.stringify(packet), clientId);
    }

    /**
     * Handles socket timeout events
     * @param {string} clientId - Unique identifier of timed-out client
     */
    onTimeoutFunction(clientId: string) {
        console.info(`Client timed out: ${clientId}`);
        this.sockets.delete(clientId);
        this.shutdownConnection(clientId);
    }

    /**
     * Handles socket error events
     * @param {Error} err - Received error object
     * @param {string} clientId - Unique identifier of errored client
     */
    onErrorFunction(err: Error, clientId: string) {
        console.error(`Error on client ${clientId}: ${err.message}`);
        this.sockets.delete(clientId);
        this.shutdownConnection(clientId);
    }

    /**
     * Handles socket close events
     * @param {string} clientId - Unique identifier of disconnected client
     */
    onCloseFunction(clientId: string) {
        console.info(`Client disconnected: ${clientId}`);
        this.sockets.delete(clientId);
        this.shutdownConnection(clientId);
    }

    /**
     * Broadcasts messages to all connected clients
     * @param {string} message - The message to broadcast
     * @param {string} [excludeClientId] - Optional client ID to exclude from broadcast
     */
    controlBroadcast(message: string, excludeClientId?: string) {
        this.sockets.forEach((socket, key) => {
            if (key !== excludeClientId) {
                socket.write(message + "%end%");
            }
        });
    }
}
