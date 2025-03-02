export interface RawControlPacket {
    type: string;
    data: any;
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

