export const CONFIG_PACKET = 'config';
export const NEW_FILTER_PACKET = 'new_filter';

export const NEW_PROXY_CONNECTION_PACKET = 'new_proxy_connection';
export const LOST_PROXY_CONNECTION_PACKET = 'lost_proxy_connection';
export const NEW_GATEWAY_CONNECTION_PACKET = 'new_gateway_connection';
export const LOST_GATEWAY_CONNECTION_PACKET = 'lost_gateway_connection';

export interface NewConnectionPacket {
    region: string;
    ip: string[];
}

export const ID_PROXY_PACKET = 'proxy_identity';
export const ID_GATEWAY_PACKET = 'gateway_identity';

export const BROADCAST = 'broadcast';
export const SHARD = 'shard';
ID_PROXY_PACKET
export const defaultRule: JSON = JSON.parse('{"action": "broadcast"}');

export const defaultConfig = (event: Event) => {
    return ["default", "", ""];
}

/*
 * Different type of rule that can be used
 *
 *  - broadcast: broadcast the message to all the connected clients
 *  - new_shard: return an id of the element and the region where it needs to be stored 
 *               to be sent to all the proxys 
 *  - shard: search the id of the element in his forwarding table and send it to the correct region
 *
 */
export interface Rule {
    action: string;
    region?: string[];
    ask_all?: boolean;
}

export interface ShardRule extends Rule {
    topic: string;
}

export interface RawControlPacket {
    type: string;
    data: any;
}

export interface RawConfig {
    topic: string;
    action: string;
    shardKeyProducer?: string;
}


export interface Config {
    topic: string;
    action: string;
    shardKeyProducer: string;
}

export interface Message {
    key: string;
    value: string;
}

export interface Event {
    topic: string;
    message: Message;
}

export interface RequestInfo {
    url: string;
}
