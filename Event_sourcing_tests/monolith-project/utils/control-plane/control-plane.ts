import net from 'net';

import { ConfigManager } from "@src/handlers/configHandler";
import {
    NewConnectionPacket,
    RawConfig,
} from '@src/control-plane/interfaces';

export class ControlPlane {
    public proxy_connections: Map<string, string[]>;
    public gateway_connections: Map<string, string[]>;

    protected ip_region: Map<string, string>;
    public config_manager: ConfigManager
    protected region: string;
    protected socket_buffer;

    constructor(region: string) {
        this.proxy_connections = new Map();
        this.gateway_connections = new Map();
        this.ip_region = new Map();
        this.config_manager = new ConfigManager();
        this.region = region;
        this.socket_buffer = "";
    }

    parentDataFunction(packet: any) {
        let data = packet.data;
        switch (packet.type) {
            default:
                break;
        }
    }


    send(data: string, ip: string, endpoint: string = "direct-forward"): Promise<Response> {
        console.debug(`Sending data to ${ip}`);
        // Send the data to the client
        return fetch(`http://${ip}/${endpoint}`, {
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
        return this.sendToRegionWithEndpoint(event, region, "direct-forward");
    }

    /**
     * Send to a specific region with a specific endpoint
     * @param data
     * @param region
     * @param endpoint
     * @returns
     */
    sendToRegionWithEndpoint(data: string, region: string[], endpoint: string): Promise<Response>[] {
        let promises: Promise<Response>[] = [];
        region.forEach((r) => {
            const connections = this.proxy_connections.get(r);
            if (connections) {
                // Get a random IP address from the region
                const randomIndex = Math.floor(Math.random() * connections.length);
                const ip = connections[randomIndex];
                promises.push(this.send(data, ip, endpoint));
            }
        });
        return promises;
    }

    /**
     * Send to all regions with a specific endpoint
     * @param data
     * @param endpoint
     * @returns
     */
    sendToAllRegionsWithEndpoint(data: string, endpoint: string): Promise<Response>[] {
        let regions = Array.from(this.proxy_connections.keys());
        return this.sendToRegionWithEndpoint(data, regions, endpoint);
    }

    /**
     * Get the regions with theNewProxyConnectionPacketctions
     * if connections is empty return an empty array
    */
    getProxyConnections(): NewConnectionPacket[] {
        let result = Array.from(
            this.proxy_connections.entries()
        )

        return result.map(([region, connections]) => {
            return {
                region,
                ip: connections
            }
        });
    }

    addProxyConnection(region: string, ip: string) {
        if (!this.proxy_connections.has(region)) {
            this.proxy_connections.set(region, []);
        }

        this.proxy_connections.get(region)?.push(ip);
        this.ip_region.set(ip, region);
        console.info(`Proxy ${ip} added to region ${region}`);
    }

    removeProxyConnection(ip: string) {
        const region = this.ip_region.get(ip);
        if (!region) {
            console.warn(`Proxy ${ip} not found for removal (control-plane.ts)`);
            return;
        }

        const connections = this.proxy_connections.get(region);
        if (!connections) {
            console.warn(`Connections not found for region ${region} (control-plane.ts)`);
            return;
        }

        const index = connections.indexOf(ip);
        if (index > -1) {
            connections.splice(index, 1);
        } else {
            console.warn(`Proxy ${ip} not found for removal (control-plane.ts)`);
        }

        if (connections.length === 0) {
            this.proxy_connections.delete(region);
        }

        this.ip_region.delete(ip);
        console.info(`Proxy ${ip} removed from region ${region}`);
    }

    getGatewayConnections(): NewConnectionPacket[] {
        let result = Array.from(
            this.gateway_connections.entries()
        )

        return result.map(([region, connections]) => {
            return {
                region,
                ip: connections
            }
        });
    }

    addGatewayConnection(region: string, ip: string) {
        if (!this.gateway_connections.has(region)) {
            console.info(`Adding new region ${region}`);
            this.gateway_connections.set(region, []);
        }

        // DEBUG:
        console.debug(`Adding new gateway connection ${ip} to region ${region}`);

        this.gateway_connections.get(region)?.push(ip);
        this.ip_region.set(ip, region);
        console.info(`Gateway ${ip} added to region ${region}`);
    }

    removeGatewayConnection(ip: string) {
        const region = this.ip_region.get(ip);
        if (!region) {
            console.warn(`Client ${ip} not found for removal (control-plane.ts)`);
            return;
        }

        const connections = this.gateway_connections.get(region);
        if (!connections) {
            console.warn(`Connections not found for region ${region} (control-plane.ts)`);
            return;
        }

        const index = connections.indexOf(ip);
        if (index > -1) {
            connections.splice(index, 1);
        } else {
            console.warn(`Client ${ip} not found for removal (control-plane.ts)`);
        }

        if (connections.length === 0) {
            this.gateway_connections.delete(region);
        }

        this.ip_region.delete(ip);
        console.info(`Client ${ip} removed from region ${region}`);
    }

    protected parseConnectionPacket(packet: any, callback: (region: string, ip: string) => void) {
        console.info('Adding connections');
        const connections = packet.data;
        for (let connection of connections) {
            const ip_address: string[] = connection.ip;
            const region = connection.region;

            if (!ip_address || !region) {
                console.error('Error getting the ip address or region');
                continue;
            }

            ip_address.forEach((ip) => {
                callback(region, ip);
            });
        }
    }

} 
