import express, { Request, Response } from 'express';
import fs from 'fs';
import axios from 'axios';
import * as http from 'http';
import httpProxy from 'http-proxy';

import {
    RouteConfig,
    GatewayConfig,
} from '@src/gateway/interfaces';
import {
    ForwardingTree,
} from '@src/gateway/forwarding-tree';


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

    constructor(configPath: string) {
        this.app = express();
        // this.app.use(express.raw({ type: '*/*' })); // Handle raw body first
        this.server = http.createServer(this.app);
        this.proxy = httpProxy.createProxyServer();
        this.setupWebSocketProxy();

        this.configPath = configPath;
        this.gatewayConfig = this.loadConfig();
        this.forwardingTree = new ForwardingTree(this.gatewayConfig.routes);
    }

    // Add WebSocket proxy handler
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
    private reloadConfig() {
        this.gatewayConfig = this.loadConfig();
        this.forwardingTree = new ForwardingTree(this.gatewayConfig.routes);
        this.setupRoutes();
    }

    private setup() {
        // Setup global middleware if any
        // this.app.use(express.raw({
        //     type: (req) => {
        //         // Skip raw body parsing for WebSocket upgrades
        //         return !req.headers.upgrade || req.headers.upgrade.toLowerCase() !== 'websocket';
        //     },
        //     limit: '10mb'
        // }));
        this.setupRoutes();

        // Watch config file for changes
        fs.watch(this.configPath, (event) => {
            if (event === 'change') {
                console.info('Config changed - reloading routes');
                this.reloadConfig();
            }
        });
    }

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

        const url = `${target}/${path || ''}`.replace(/\/+/g, '/'); // Normalize URL
        const targetUrl = new URL(url);

        console.info(`Proxying to ${url}`);
        this.proxy.web(req, res, {
            target: route.target,
            secure: false,
            changeOrigin: true,
            headers: {
                host: targetUrl.host
            }
        });

        // console.info(`Proxying to ${url}`);
        // const response = await axios({
        //     method: req.method,
        //     url: url,
        //     data: req.body,
        //     headers: { ...req.headers, host: new URL(url).host }
        // });
        // res.status(response.status).send(response.data);
    }

    private async getRequestForward(req: Request, res: Response) {
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

        const url = `${target}/${path || ''}`.replace(/\/+/g, '/'); // Normalize URL
        const targetUrl = new URL(url);

        console.debug(`Proxying to ${url}`);
        this.proxy.web(req, res, {
            target: route.target,
            secure: false,
            changeOrigin: true,
            headers: {
                host: targetUrl.host
            }
        });
    }

    public start() {
        this.setup();
        this.app.listen(this.gatewayConfig.port, () => {
            console.log(`Server is running on port ${this.gatewayConfig.port}`);
        })
    }

    public printRoutes() {
        this.app._router.stack.forEach(print.bind(null, []));
    }
}
