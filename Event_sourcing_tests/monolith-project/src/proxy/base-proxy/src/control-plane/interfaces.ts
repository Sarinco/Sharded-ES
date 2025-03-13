export const CONFIG_PACKET = 'config';

export const NEW_CONNECTION_PACKET = 'new_connection';
export const LOST_CONNECTION_PACKET = 'lost_connection';
export interface NewConnectionPacket {
    region: string;
    ip: string[];
}

export const ID_PACKET = 'identity';

export const BROADCAST = 'broadcast';
export const NEW_SHARD = 'new_shard';
export const SHARD = 'shard';

export const defaultRule = (event: Event) => {
    return {
        action: 'broadcast',
        id: '-1'
    }
};

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
    id: string;
    region?: string[];
}

export interface NewShardRule extends Rule {
    topic: string;
    region: string[];
}

export interface RawControlPacket {
    type: string;
    data: any;
}

export interface RawConfig {
    topic: string;
    action: string;
    rules?: string;
}


export interface Config {
    topic: string;
    action: string;
    rules: string;
}

export interface Message {
    key: string;
    value: string;
}
export interface Event {
    topic: string;
    message: Message;
}

