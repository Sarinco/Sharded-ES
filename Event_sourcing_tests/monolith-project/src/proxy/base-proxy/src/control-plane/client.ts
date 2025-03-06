import net from 'net';
import { ConfigManager } from "@src/custom-handler/configHandler";
import {
    RawControlPacket,
    CONFIG_PACKET
} from '@src/control-plane/interfaces';

export class ControlPlaneClient {
    private socket: net.Socket;
    private port: number;
    private host: string;
    public config_manager: ConfigManager;

    constructor(host: string, port: number) {
        this.port = port;
        this.host = host;
        this.socket = new net.Socket();
        this.config_manager = new ConfigManager();
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
        const data_json = JSON.parse(data.toString());

        switch (data_json.type) {
            case CONFIG_PACKET:
                this.config_manager.setConfig(data_json.data);
                break    
            default:
                console.log('Unknown packet type');
        }
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
    send(data: Buffer, type: string): Promise<void> {
        const packet: RawControlPacket = {
            type: type,
            data: JSON.parse(data.toString())
        };
        return new Promise((resolve, reject) => {
            this.socket.write(JSON.stringify(packet), (err) => {
                if (err) {
                    reject(err);
                } else {
                    resolve();
                }
            });
        });
    }
}
