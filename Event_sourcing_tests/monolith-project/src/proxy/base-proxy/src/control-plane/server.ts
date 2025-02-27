import net from 'net';
import { replaceAddress } from "@src/custom-handler/filterHandler";

function getSimpleIPAddress(remoteAddress: string | undefined): string | null {
    if (!remoteAddress) {
        return null;
    }

    // Check if the address is an IPv4 address mapped to IPv6
    if (remoteAddress.startsWith('::ffff:')) {
        return remoteAddress.substring(7); // Remove the '::ffff:' prefix
    }

    return remoteAddress; // Return the original address if it's IPv6 or already simple
}

export class ControlPlaneServer {
    private server: net.Server;
    private port: number;
    private clients: Map<string, net.Socket>; // Store active connections
    private filter_map: Map<string, string>;
    private connections: Map<string, net.Socket>;
    private own_filter: string;

    constructor(port: number, own_filter: string) {
        this.port = port;
        this.server = net.createServer();
        this.clients = new Map();
        this.connections = new Map();
        this.filter_map = new Map();
        this.own_filter = own_filter;
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
            this.clients.forEach((socket) => socket.destroy());
            this.clients.clear();
        });
    }

    // Handle incoming connections
    onConnection() {
        this.server.on('connection', (socket) => {
            const remoteAddress = getSimpleIPAddress(socket.remoteAddress);
            const clientId = `${remoteAddress}:${socket.remotePort}`;
            console.log(`New client connected: ${clientId}`);

            this.onConnectionFunction(socket, clientId);

            // Store the socket in the clients map
            this.clients.set(clientId, socket);

            // Attach event listeners to the socket
            socket.on('data', (data) => {
                this.onDataFunction(data, clientId);
            });

            socket.on('close', () => {
                console.log(`Client disconnected: ${clientId}`);
                this.clients.delete(clientId);
                // this.callbackFunctions.onClose(clientId);
            });

            socket.on('timeout', () => {
                console.log(`Client timed out: ${clientId}`);
                this.clients.delete(clientId);
                // this.callbackFunctions.onTimeout(clientId);
            });

            socket.on('error', (err) => {
                console.log(`Client error: ${clientId}`);
                this.clients.delete(clientId);
                // this.callbackFunctions.onError(err, clientId);
            });
        });
    }

    onConnectionFunction(socket: net.Socket, clientId: string) {
        // Send filter to the client
        const ipAddress = getSimpleIPAddress(socket.localAddress);
        const port = socket.remotePort;
        if (!ipAddress || !port) {
            console.log('Error getting the IP address or port');
            return;
        }
        console.log("My IP address: ", ipAddress);
        const modifiedFilter = replaceAddress(this.own_filter, ipAddress)
        socket.write(modifiedFilter);

        // Send all filters to the client
        for (const [key, value] of this.filter_map.entries()) {
            socket.write(value);
        }

        // Add client to active connections
        this.connections.set(clientId, socket);
    }

    onDataFunction(data: Buffer, clientId: string) {
        // Broadcast the message to all connected clients
        this.broadcast(data.toString(), clientId);

        this.filter_map.set(clientId, data.toString());
    }

    // Broadcast a message to all connected clients
    broadcast(message: string, excludeClientId?: string) {
        this.clients.forEach((socket, clientId) => {
            if (clientId !== excludeClientId) {
                socket.write(message);
            }
        });
    }

    // Send a message to a specific client
    sendToClient(clientId: string, message: string) {
        const socket = this.clients.get(clientId);
        if (socket) {
            socket.write(message);
        } else {
            console.error(`Client ${clientId} not found`);
        }
    }

    // Get all connected client IDs
    getConnectedClients(): string[] {
        return Array.from(this.clients.keys());
    }
}
