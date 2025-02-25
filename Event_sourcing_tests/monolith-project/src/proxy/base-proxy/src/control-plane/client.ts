import net from 'net';

export class ControlPlaneClient {
    private socket: net.Socket;
    private port: number;
    private host: string;
    private filter_map: Map<string, string>;

    constructor(host: string, port: number) {
        this.port = port;
        this.host = host;
        this.socket = new net.Socket();
        this.filter_map = new Map();
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
        const dataJson = JSON.parse(data.toString());
        console.log("Recieved data: ", dataJson);
        // TODO: Manage filter
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
