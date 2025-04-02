
export interface RouteConfig {
    path: string;
    target: string;
}

export interface GatewayConfig {
    routes: RouteConfig[];
    port: number;
}
