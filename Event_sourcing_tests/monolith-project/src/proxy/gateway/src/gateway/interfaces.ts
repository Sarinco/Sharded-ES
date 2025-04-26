
export interface RouteConfig {
    path: string;
    topic: string;
    target: string;
}

export interface GatewayConfig {
    routes: RouteConfig[];
    port: number;
}
