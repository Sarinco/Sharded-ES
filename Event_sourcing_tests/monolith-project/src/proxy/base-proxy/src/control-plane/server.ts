import net from 'net';
import { CallbackFunctions } from './callbackFunctions';

export class ControlPlaneServer {
    private server: net.Server;
    private port: number;
    private clients: Map<string, net.Socket>; // Store active connections
    private callbackFunctions: CallbackFunctions;

    constructor(port: number, callbackFunctions: CallbackFunctions) {
        this.port = port;
        this.server = net.createServer();
        this.clients = new Map();
        this.callbackFunctions = callbackFunctions;
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
            const clientId = `${socket.remoteAddress}:${socket.remotePort}`;
            console.log(`New client connected: ${clientId}`);

            this.callbackFunctions.onConnection(socket, clientId);

            // Store the socket in the clients map
            this.clients.set(clientId, socket);

            // Attach event listeners to the socket
            socket.on('data', (data) => {
                this.callbackFunctions.onData(data, clientId);
            });

            socket.on('close', () => {
                console.log(`Client disconnected: ${clientId}`);
                this.clients.delete(clientId);
                this.callbackFunctions.onClose(clientId);
            });

            socket.on('timeout', () => {
                console.log(`Client timed out: ${clientId}`);
                this.clients.delete(clientId);
                this.callbackFunctions.onTimeout(clientId);
            });

            socket.on('error', (err) => {
                console.log(`Client error: ${clientId}`);
                this.clients.delete(clientId);
                this.callbackFunctions.onError(err, clientId);
            });
        });
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
