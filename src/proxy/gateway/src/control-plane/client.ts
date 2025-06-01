import net from 'net';
import { ConfigManager } from "@src/handlers/configHandler";
import {
    RawControlPacket,
    CONFIG_PACKET,
    NEW_PROXY_CONNECTION_PACKET,
    LOST_PROXY_CONNECTION_PACKET,
    NEW_FILTER_PACKET,
    NEW_GATEWAY_CONNECTION_PACKET,
    LOST_GATEWAY_CONNECTION_PACKET
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
                console.info(`Control Plane client connected to port ${this.port}`);
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
            let data_json;
            try {
                data_json = JSON.parse(split_queries[i]);
            } catch (e) {
                console.error('Error parsing JSON data');
                continue;
            }

            this.parentDataFunction(data_json);
            switch (data_json.type) {
                case CONFIG_PACKET:
                    this.config_manager.setConfig(data_json.data);
                    break;
                
                case NEW_FILTER_PACKET:
                    this.config_manager.addFilter(data_json.data);
                    break;

                case NEW_PROXY_CONNECTION_PACKET: {
                    let callback = (region: string, ip_address: string) => {
                        this.addProxyConnection(region, ip_address);
                    };
                    this.parseConnectionPacket(data_json, callback);
                    break;
                }

                case LOST_PROXY_CONNECTION_PACKET:
                    const lost_connection = data_json.data;
                    const ip_address = lost_connection.ip;

                    if (!ip_address) {
                        console.error('Error getting the ip address for removal');
                        continue;
                    }

                    this.removeProxyConnection(ip_address);
                    break;

                case NEW_GATEWAY_CONNECTION_PACKET: {
                    let callback = (region: string, ip_address: string) => {
                        this.addGatewayConnection(region, ip_address);
                    }
                    this.parseConnectionPacket(data_json, callback);
                    break;
                }

                case LOST_GATEWAY_CONNECTION_PACKET:
                    const lost_gateway_connection = data_json.data;
                    const gateway_ip_address = lost_gateway_connection.ip;

                    if (!gateway_ip_address) {
                        console.error('Error getting the gateway ip address for removal');
                        continue;
                    }

                    this.removeGatewayConnection(gateway_ip_address);
                    break;

                default:
                    console.warn(`Unknown packet type : ${data_json.type}`);
            }
        }

        // put the remaining data into the buffer
        this.socket_buffer = split_queries[split_queries.length - 1];
    }

    // Disconnect from the server
    disconnect(): Promise<void> {
        return new Promise((resolve, reject) => {
            this.socket.end(() => {
                console.info('Control Plane client disconnected');
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
