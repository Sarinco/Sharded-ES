import net from 'net';

import { ConfigManager } from "@src/custom-handler/configHandler";
import {
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
        this.config_manager = new ConfigManager();
        this.region = region;
        this.socket_buffer = "";
    }

    // Broadcast a message to all connected connections
    broadcast(message: string, excludeClientId?: string) {
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
