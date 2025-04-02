import express from 'express';
import fs from 'fs';

import {
    RouteConfig,
    GatewayConfig,
} from '@src/gateway/interfaces';

export class DynamicGateway {
    private app: express.Application;
    private configPath: string;
    private gatewayConfig: GatewayConfig;
    private targetMap: Map<string, string>;;
    private forwardMethods: string[] = ['POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS', 'TRACE', 'CONNECT'];

    constructor(configPath: string) {
        this.app = express();
        // Parse JSON bodies
        this.app.use(express.json());
        this.configPath = configPath;
        this.targetMap = new Map();
        this.gatewayConfig = this.loadConfig();
    }

    private loadConfig(): GatewayConfig {
        const config = JSON.parse(fs.readFileSync(this.configPath, 'utf-8'));
        config.routes.forEach((route: RouteConfig) => {
            this.targetMap.set(route.path, route.target)
        })
        return config;
    }
    private reloadConfig() {
        this.gatewayConfig = this.loadConfig();
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
                        const response = await this.forwardRequest(req, res);
                        // res.status(response.status).send(response.data);
                    } catch (error) {
                        res.status(500).send({ error: 'Gateway error' });
                    }
                });
            });
            router.get(route.path, async (req: express.Request, res: express.Response) => {
                    try {
                        // Here you would implement the actual request forwarding
                        const response = await this.getRequestForward(req, res);
                        // res.status(response.status).send(response.data);
                    } catch (error) {
                        res.status(500).send({ error: 'Gateway error' });
                    }
                })

            this.app.use(route.path, router);
        });
    }

    private async forwardRequest(req: express.Request, res: express.Response) {
        res.status(500).send(`Forwarding not done: req url ${req.originalUrl}`)
    }

    private async getRequestForward(req: express.Request, res: express.Response) {
        res.status(500).send(`Get forwarding not done: req url ${req.originalUrl}`)
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
}
