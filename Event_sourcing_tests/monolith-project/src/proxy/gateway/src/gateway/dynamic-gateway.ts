import express, { Request, Response } from 'express';
import fs from 'fs';

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
    private configPath: string;
    private gatewayConfig: GatewayConfig;
    private forwardingTree: ForwardingTree;
    private forwardMethods: string[] = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS', 'TRACE', 'CONNECT'];

    constructor(configPath: string) {
        this.app = express();
        // Parse JSON bodies
        this.app.use(express.json());
        this.configPath = configPath;
        this.gatewayConfig = this.loadConfig();
        this.forwardingTree = new ForwardingTree(this.gatewayConfig.routes);
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
        this.app._router.stack = this.app._router.stack.filter(
            (layer: any) => {
                return !layer.route;
            }
        );

        // Add new routes from config
        this.gatewayConfig.routes.forEach(route => {
            const router = express.Router();

            console.info(`Setting up ${route.path} to ${route.target}`);
            const methods = this.forwardMethods;

            methods.forEach(method => {
                (router as any)[method.toLowerCase()]('/', async (req: express.Request, res: express.Response) => {
                    try {
                        // Here you would implement the actual request forwarding
                        let response: globalThis.Response;
                        if (method === 'GET') {
                            response = await this.getRequestForward(req);
                        } else {
                            response = await this.forwardRequest(req);
                        }
                        const data = await response.json();
                        res.status(response.status).send(data);
                    } catch (error) {
                        console.error('Error in forwarding request: ', error);
                        res.status(500).send({ error: 'Gateway error' });
                    }
                });
            });

            this.app.use(route.path, router);
        });
        this.printRoutes();
    }

    private async forwardRequest(req: Request): Promise<globalThis.Response> {
        const route = this.forwardingTree.getRoute(req.originalUrl);
        if (!route) throw new Error('Route not found');

        const target = route.target;
        const path = route.path;

        if (!target) {
            throw new Error('No target found');
        }
        if (path === undefined) {
            throw new Error('No path found');
        }

        const url = `${target}/${path || ''}`.replace(/\/+/g, '/'); // Normalize URL

        // Clone headers and remove 'host' (target server may reject it)
        const headers = { ...req.headers } as Record<string, string>;
        delete headers['host'];

        // Handle body based on content-type
        let body: BodyInit | undefined;
        if (req.body) {
            if (headers['content-type']?.includes('application/json')) {
                body = JSON.stringify(req.body); // Stringify JSON
            } else if (Buffer.isBuffer(req.body) || typeof req.body === 'string') {
                body = req.body as BodyInit; // Use as-is for buffers/text
            } else {
                body = req.body.toString(); // Fallback
            }
        }

        // Forward the request
        return fetch(url, {
            method: req.method,
            headers,
            body,
        });
    }

    private async getRequestForward(req: Request): Promise<globalThis.Response> {
        throw new Error('Method not implemented.');
    }

    public start() {
        this.setup();
        this.app.get('/health', (_req, res) => {
            res.status(200).send('Gateway is healthy');
        });
        this.app.listen(this.gatewayConfig.port, () => {
            console.log(`Server is running on port ${this.gatewayConfig.port}`);
        })
    }

    public printRoutes() {
        this.app._router.stack.forEach(print.bind(null, []));
    }
}
