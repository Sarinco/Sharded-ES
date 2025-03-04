export const ADD_FILTER = 'add_filter';
export const REMOVE_FILTER = 'remove_filter';

export interface RawControlPacket {
    type: string;
    data: any;
}

export interface AddFilterPacket {
    type: string;
    data: Filter;
}

export interface RemoveFilterPacket {
    type: string;
    data: string;
}

export interface Filter {
    name: string;
    proxy_address: string;
    region: string;
    topic: string;
    filters: Array<JSON>;
}

export interface Event {
    topic: string;
    region: string;
    message: string;
}

