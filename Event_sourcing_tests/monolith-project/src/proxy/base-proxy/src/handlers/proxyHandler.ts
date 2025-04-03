
class Proxy {
    private static instance: Proxy;
    private url: URL;

    private constructor() {
        const PROXY_ADDRESS = process.env.PROXY_ADDRESS;
        const PROXY_PORT = process.env.PROXY_PORT;
        const PROXY = `http://${PROXY_ADDRESS}:${PROXY_PORT}/`;
        if (!PROXY_ADDRESS || !PROXY_PORT) {
            console.debug('Proxy address and port not set');
            this.url = new URL('http://localhost:80/');
            return;
        }
        this.url = new URL(PROXY);
        console.debug(`Proxy URL: ${this.url}`);
    }

    public static getInstance(): Proxy {
        if (!Proxy.instance) {
            Proxy.instance = new Proxy();
        }

        return Proxy.instance;
    }

    public getUrl(): URL {
        return this.url;
    }

    public async send(topic: string, message: any): Promise<Response> {
        const body = {
            topic,
            message
        }

        let url = this.getUrl();

        const result = await fetch(url.toString(), {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(body),
        })

        if (result.status >= 500) {
            console.debug(result);
            throw new Error('Error forwarding the message');
        }
        console.debug(`Content type: ${result.headers.get('Content-Type')}`);
        return result;
    }

}

export const producer = Proxy.getInstance();
