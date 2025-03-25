import net from 'net';

import { ConfigManager } from "@src/custom-handler/configHandler";
import {
    NEW_SHARD,
    NewConnectionPacket,
    RawConfig,
} from '@src/control-plane/interfaces';

export class ControlPlane {
    public connections: Map<string, string[]>;
    private ip_region: Map<string, string>;
    public config_manager: ConfigManager
    protected region: string;
    protected socket_buffer;

    constructor(region: string) {
        this.connections = new Map();
        this.ip_region = new Map();
        this.config_manager = new ConfigManager(this);
        this.region = region;
        this.socket_buffer = "";
    }

    parentDataFunction(packet: any) {
        let data = packet.data;
        switch (packet.type) {
            case NEW_SHARD:
                const result = { id: data.id, region: data.region };
                break;
            default:
                console.log('Unknown event type for parent control plane');
                break;
        }
    }


    send(data: string, ip: string): Promise<Response> {
        console.debug(`Sending data to ${ip}`);
        // Send the data to the client
        return fetch(`http://${ip}/direct-forward`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: data
        })
    }

    // Broadcast a message to all connected connections
    broadcast(event: string) {
        const all_ips = Array.from(this.ip_region.keys());
        console.log('Broadcasting message to: ', all_ips);
        all_ips.forEach((ip) => {
            this.send(event, ip);
        });
    }

    /**
     * Send to a specific region
     * @param event
     * @param region
     * @returns
     */
    sendToRegion(event: string, region: string[]): Promise<Response>[] {
        let promises: Promise<Response>[] = [];
        region.forEach((r) => {
            const connections = this.connections.get(r);
            if (connections) {
                connections.forEach((ip) => {
                    promises.push(this.send(event, ip))
                });
            }
        });
        return promises;
    }

    /**
     * Get the regions with their associated connections
     * if connections is empty return an empty array
    */
    getConnectedconnections(): NewConnectionPacket[] {
        let result = Array.from(
            this.connections.entries()
        )

        return result.map(([region, connections]) => {
            return {
                region,
                ip: connections
            }
        });
    }

    addConnection(region: string, ip: string) {
        if (!this.connections.has(region)) {
            this.connections.set(region, []);
        }

        this.connections.get(region)?.push(ip);
        this.ip_region.set(ip, region);
        console.log(`Client ${ip} added to region ${region}`);
    }

    removeConnection(ip: string) {
        const region = this.ip_region.get(ip);
        if (!region) {
            console.log(`Client ${ip} not found for removal (control-plane.ts)`);
            return;
        }

        const connections = this.connections.get(region);
        if (!connections) {
            console.log(`Connections not found for region ${region} (control-plane.ts)`);
            return;
        }

        const index = connections.indexOf(ip);
        if (index > -1) {
            connections.splice(index, 1);
        } else {
            console.log(`Client ${ip} not found for removal (control-plane.ts)`);
        }

        if (connections.length === 0) {
            this.connections.delete(region);
        }

        this.ip_region.delete(ip);
        console.log(`Client ${ip} removed from region ${region}`);
    }

} 
