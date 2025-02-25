import net from 'net';
import { CallbackFunctions } from './callbackFunctions';

export class ControlPlaneClient {
    private socket: net.Socket;
    private port: number;
    private host: string;
    private clients: Map<string, net.Socket>; // Store active connections
    private callbackFunctions: CallbackFunctions;

    constructor(host: string, port: number, callbackFunctions: CallbackFunctions) {
        this.port = port;
        this.host = host;
        this.socket = new net.Socket();
        this.clients = new Map();
        this.callbackFunctions = callbackFunctions;
    }

    // Connect to the server
    connect(): Promise<void> {
        const address = `${this.host}:${this.port}`;
        return new Promise((resolve, reject) => {
            this.socket.connect(this.port, this.host, () => {
                console.log(`Control Plane client connected to port ${this.port}`);
                resolve();
            });

            this.socket.on('error', (err) => {
                reject(err);
            });
        });
    }

    // Disconnect from the server
    disconnect(): Promise<void> {
        return new Promise((resolve, reject) => {
            this.socket.end(() => {
                console.log('Control Plane client disconnected');
                resolve();
            });
        });
    }
}
