import net from 'net';
import { ConfigManager } from "@src/custom-handler/configHandler";
import {
    RawControlPacket,
    CONFIG_PACKET,
    ID_PACKET,
    NEW_CONNECTION_PACKET,
    NewConnectionPacket,
    LOST_CONNECTION_PACKET,
    NEW_SHARD
} from '@src/control-plane/interfaces';
import { ControlPlane } from '@src/control-plane/control-plane';

export class ControlPlaneClient extends ControlPlane {
    private socket: net.Socket;
    private port: number;
    private host: string;

    constructor(host: string, port: number, region: string) {
        super(region);
        this.port = port;
        this.host = host;
        this.socket = new net.Socket();
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

        let full_data = this.socket_buffer + data.toString()
        let split_queries = full_data.split("%end%");

        if (split_queries.length < 2) {
            this.socket_buffer = full_data;
            return;
        }

        for (let i = 0; i < split_queries.length - 1; i++) {
            console.log("full data packet received : ", split_queries[i]);
            let data_json;
            try {
                data_json = JSON.parse(split_queries[i]);
            } catch (e) {
                console.log('Error parsing JSON data');
                continue;
            }

            this.parentDataFunction(data_json);
            switch (data_json.type) {
                case CONFIG_PACKET:
                    this.config_manager.setConfig(data_json.data);
                    break;

                case NEW_CONNECTION_PACKET:
                    const connections = data_json.data;
                    for (let connection of connections) {
                        const ip_address: string[] = connection.ip;
                        const region = connection.region;

                        if (!ip_address || !region) {
                            console.log('Error getting the ip address or region');
                            continue;
                        }

                        ip_address.forEach((ip) => {
                            this.addConnection(region, ip);
                        });
                    }
                    break;

                case LOST_CONNECTION_PACKET:
                    const lost_connection = data_json.data;
                    const ip_address = lost_connection.ip;

                    if (!ip_address) {
                        console.log('Error getting the ip address for removal');
                        continue;
                    }

                    this.removeConnection(ip_address);
                    break;

                default:
                    console.log(`Unknown packet type : ${data_json.type}`);
            }
        }

        // put the remaining data into the buffer
        this.socket_buffer = split_queries[split_queries.length - 1];
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
    sendControl(data: Buffer, type: string): Promise<void> {
        const packet: RawControlPacket = {
            type: type,
            data: JSON.parse(data.toString())
        };

        let full_data = JSON.stringify(packet) + "%end%";

        return new Promise((resolve, reject) => {
            this.socket.write(full_data, (err) => {
                if (err) {
                    reject(err);
                } else {
                    resolve();
                }
            });
        });
    }
}
