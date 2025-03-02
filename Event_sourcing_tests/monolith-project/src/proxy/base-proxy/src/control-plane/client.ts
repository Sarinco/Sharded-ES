import net from 'net';
import { FilterManager } from "@src/custom-handler/filterHandler";

export class ControlPlaneClient {
    private socket: net.Socket;
    private port: number;
    private host: string;
    public filter_manager: FilterManager;

    constructor(host: string, port: number) {
        this.port = port;
        this.host = host;
        this.socket = new net.Socket();
        this.filter_manager = new FilterManager();
    }

    // Connect to the server
    connect(): Promise<void> {
        const address = `${this.host}:${this.port}`;
        return new Promise((resolve, reject) => {
            this.socket.connect(this.port, this.host, () => {
                console.log(`Control Plane client connected to port ${this.port}`);
                resolve();
            });

            this.socket.on('data', (data) => {
               this.onDataFunction(data); 
            });

            this.socket.on('close', () => {
            });

            this.socket.on('timeout', () => {
            });

            this.socket.on('error', (err) => {
                reject(err);
            });
        });
    }

    onDataFunction(data: Buffer) {
        console.debug('Data received:', data.toString());
        const dataJson = JSON.parse(data.toString());
        // TODO: Manage filter
        this.filter_manager.addFilter(dataJson);
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

    // Send data to the server
    send(data: Buffer): Promise<void> {
        return new Promise((resolve, reject) => {
            this.socket.write(data, (err) => {
                if (err) {
                    reject(err);
                } else {
                    resolve();
                }
            });
        });
    }
}
