import express, { Request, Response } from 'express';
import fs from 'fs';
import axios from 'axios';
import * as http from 'http';
import httpProxy from 'http-proxy';

import {
    GatewayConfig,
} from '@src/gateway/interfaces';
import {
    ForwardingTree,
} from '@src/gateway/forwarding-tree';
import { ControlPlane } from '@src/control-plane/control-plane';
import { Event, RequestInfo } from '@src/control-plane/interfaces';


function print(path: any, layer: any) {
    if (layer.route) {
        layer.route.stack.forEach(print.bind(null, path.concat(split(layer.route.path))))
    } else if (layer.name === 'router' && layer.handle.stack) {
        layer.handle.stack.forEach(print.bind(null, path.concat(split(layer.regexp))))
    } else if (layer.method) {
        console.log('%s /%s',
            layer.method.toUpperCase(),
            path.concat(split(layer.regexp)).filter(Boolean).join('/'))
    }
}

function split(thing: any) {
    if (typeof thing === 'string') {
        return thing.split('/')
    } else if (thing.fast_slash) {
        return ''
    } else {
        var match = thing.toString()
            .replace('\\/?', '')
            .replace('(?=\\/|$)', '$')
            .match(/^\/\^((?:\\[.*+?^${}()|[\]\\\/]|[^.*+?^${}()|[\]\\\/])*)\$\//)
        return match
            ? match[1].replace(/\\(.)/g, '$1').split('/')
            : '<complex:' + thing.toString() + '>'
    }
}


export class DynamicGateway {
    private app: express.Application;
    private server: http.Server;
    private proxy: httpProxy;
    private configPath: string;
    private gatewayConfig: GatewayConfig;
    private forwardingTree: ForwardingTree;
    private forwardMethods: string[] = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS', 'TRACE', 'CONNECT'];

    private control_plane: ControlPlane;

    constructor(configPath: string, control_plane: ControlPlane) {
        this.app = express();
        // this.app.use(express.raw({ type: '*/*' })); // Handle raw body first
        this.server = http.createServer(this.app);
        this.proxy = httpProxy.createProxyServer();
        this.setupWebSocketProxy();

        this.configPath = configPath;
        this.gatewayConfig = this.loadConfig();
        this.forwardingTree = new ForwardingTree(this.gatewayConfig.routes);

        this.control_plane = control_plane;
    }

    /**
    * Setup the WebSocket proxy
    * This method is called when the server receives an upgrade request
    * It checks if the request URL matches any of the routes in the forwarding tree
    * If it does, it forwards the request to the target server
    * If it doesn't, it destroys the socket
    */
    private setupWebSocketProxy() {
        this.server.on('upgrade', (req, socket, head) => {
            const route = this.forwardingTree.getRoute(req.url || '');
            if (!route?.target) {
                socket.destroy();
                return;
            }

            const target = new URL(route.target);
            this.proxy.ws(req, socket, head, {
                target: `ws://${target.host}`,
                headers: { host: target.host }
            });
        });
    }

    private loadConfig(): GatewayConfig {
        const config = JSON.parse(fs.readFileSync(this.configPath, 'utf-8'));
        return config;
    }

    /**
     * Reload the config file and update the routes
     */
    private reloadConfig() {
        this.gatewayConfig = this.loadConfig();
        this.forwardingTree = new ForwardingTree(this.gatewayConfig.routes);
        this.setupRoutes();
    }

    /**
     * Setup the routes for the gateway
     * This method is called when the server starts or when the config file is reloaded
     */
    private setup() {
        this.setupRoutes();

        // Watch config file for changes
        fs.watch(this.configPath, (event) => {
            if (event === 'change') {
                console.info('Config changed - reloading routes');
                this.reloadConfig();
            }
        });
    }

    /**
     * Setup the routes for the gateway
     * This method is called when the server starts or when the config file is reloaded
     */
    private setupRoutes() {
        // Clear existing routes
        if (this.app._router) {
            console.info('Clearing existing routes');
            this.app._router.stack = this.app._router.stack.filter(
                (layer: any) => {
                    return !layer.route;
                }
            );
            return;
        }

        // Add new routes from config
        const router = express.Router();
        const methods = this.forwardMethods;

        methods.forEach(method => {
            (router as any)[method.toLowerCase()]('/*', async (req: express.Request, res: express.Response) => {
                try {
                    // Here you would implement the actual request forwarding
                    if (method === 'GET') {
                        if (req.originalUrl === '/health') {
                            res.status(200).send('Gateway is healthy');
                            return;
                        }
                        await this.getRequestForward(req, res);
                    } else {
                        await this.forwardRequest(req, res);
                    }
                } catch (error) {
                    console.error('Error in forwarding request: ', error);
                    res.status(500).send({ error: 'Gateway error' });
                }
            });
        });
        this.app.use('/', router);

        this.printRoutes();
    }

    /**
     * Forward the request to the target server
     * This method is called when the request matches a route in the forwarding tree
     * @param req
     * @param res
     */
    private async forwardRequest(req: Request, res: Response) {
        const route = this.forwardingTree.getRoute(req.originalUrl);
        if (!route) throw new Error('Route not found');

        const target = route.target;
        const path = req.originalUrl;

        if (!target) {
            throw new Error('No target found');
        }
        if (path === undefined) {
            throw new Error('No path found');
        }

        const uri = `${target}${path || ''}` // Normalize URL
        const targetUrl = new URL(uri);

        console.info(`Proxying to ${targetUrl.toString()}`);
        this.proxy.web(req, res, {
            target: route.target,
            secure: false,
            changeOrigin: true,
            headers: {
                host: targetUrl.host
            }
        });
    }

    /**
     * Handle GET requests
     * @param req
     * @param res
     */
    private async getRequestForward(req: Request, res: Response) {
        const route = this.forwardingTree.getRoute(req.originalUrl);
        if (!route) throw new Error('Route not found');
        if (!route.target) throw new Error('No target found');
        if (!route.topic) throw new Error('No topic found');

        let target = route.target;
        const path = req.originalUrl;

        // Check if the request need to be forwarded to another gateway
        const request_info: RequestInfo = {
            url: req.originalUrl,
        }
        const event: Event = {
            topic: route.topic,
            message: {
                key: 'N/A',
                value: JSON.stringify(request_info) 
            }
        };
        const extracted_data: string[] = this.control_plane.matchCallback(event);
        // Check if the extracted data matches any of the filters
        if (extracted_data.length > 0) {
            const rule = this.control_plane.matchFilter(extracted_data);
            const new_target = this.control_plane.getTargetGateway(rule.region[0])
            if (new_target) {
                console.debug('New target:', new_target);
                target = new_target;
            }
        }


        if (!target) {
            throw new Error('No target found');
        }
        if (path === undefined) {
            throw new Error('No path found');
        }

        const uri = `${target}${path || ''}`; // Normalize URL
        const targetUrl = new URL(uri);

        console.info(`Proxying to ${targetUrl.toString()}`);
        this.proxy.web(req, res, {
            target: target,
            secure: false,
            changeOrigin: true,
            headers: {
                host: targetUrl.host
            }
        });
    }

    /**
     * Start the gateway server
     */
    public start() {
        this.setupDebugRoutes();
        this.setup();
        this.app.listen(this.gatewayConfig.port, () => {
            console.log(`Server is running on port ${this.gatewayConfig.port}`);
        })
    }

    private setupDebugRoutes() {
        const debugRouter = express.Router();

        // Get all connected clients
        debugRouter.get('/proxy-connections', (_req: Request, res: Response) => {
            console.info('Connections: ', this.control_plane.getProxyConnections());
            const connections: string = JSON.stringify(this.control_plane.getProxyConnections());

            res.status(200).send(connections);
        });

        debugRouter.get('/gateway-connections', (_req: Request, res: Response) => {
            console.info('Connections: ', this.control_plane.getGatewayConnections());
            const connections: string = JSON.stringify(this.control_plane.getGatewayConnections());

            res.status(200).send(connections);
        });

        const DEBUG_PORT = process.env.DEBUG_PORT || 7000;
        const app = express();
        app.use('/', debugRouter);
        app.listen(DEBUG_PORT, () => {
            console.info(`Debug server is running on port ${DEBUG_PORT}`);
        });
    }

    /**
     * Stop the gateway server
     */
    public printRoutes() {
        this.app._router.stack.forEach(print.bind(null, []));
    }
}
