import net from 'net';
import { ConfigManager } from "@src/custom-handler/configHandler";
import {
    RawControlPacket,
    CONFIG_PACKET
} from '@src/control-plane/interfaces';

export class ControlPlaneClient {
    private socket: net.Socket;
    private socketBuffer: string = "";
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
        // parse data to make sure that all the data has arrived, buffer
        // the data that is not completed yet.
        // the data must end by the string "%end%" to be parseable

        let full_data = this.socketBuffer + data.toString()
        let split_queries = full_data.split("%end%");
 
        if (split_queries.length < 2 ){
            this.socketBuffer = full_data;
            return;
        }

        for (let i= 0; i < split_queries.length-1; i++){
            console.log("full data packet received : ", split_queries[i]);
            const data_json = JSON.parse(split_queries[i]);

            switch (data_json.type) {
                case CONFIG_PACKET:
                    this.config_manager.setConfig(data_json.data);
                    break    
                default:
                    console.log('Unknown packet type');
            }
        }

        // put the remaining data into the buffer
        this.socketBuffer = split_queries[split_queries.length-1];
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
