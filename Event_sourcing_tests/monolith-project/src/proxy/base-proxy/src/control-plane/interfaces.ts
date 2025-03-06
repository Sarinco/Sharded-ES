export const CONFIG_PACKET = 'config';
export const BROADCAST = 'broadcast';

export const defaultRule = (event: Event) => {
    return {
        action: 'broadcast',
        id: '-1'
    }
};

export interface Rule {
    action: string;
    id: string;
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

export interface Event {
    topic: string;
    region: string;
    message: string;
}

