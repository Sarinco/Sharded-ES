import { 
    RouteConfig
} from '@src/gateway/interfaces';

export class ForwardingTree {
    private routes: RouteConfig[];
    // INFO: The root node does not have a path associated with it
    private root: ForwardingNode;

    constructor(routes: RouteConfig[]) {
        this.routes = routes;
        this.root = new ForwardingNode();
        this.buildTree();
    }

    buildTree() {
        this.routes.forEach(route => {
            const path = route.path.split('/');
            this.root.addChild(path.slice(1), route.target);
        });
        this.printTree();
    }

    getRoute(path: string): { target: string, path: string } | undefined {
        const pathParts = path.split('/');
        return this.root.findRoute(pathParts.slice(1));
    }

    printTree() {
        let result = this.root.printNode();
        console.debug('Forwarding tree: ', result);
    }
}

export class ForwardingNode {
    private children: Map<string, ForwardingNode> = new Map();
    private parent: ForwardingNode | null = null;
    private target: string | undefined;

    constructor(parent: ForwardingNode | null = null) {
        this.parent = parent;
    }

    addChild(path: string[], target: string) {
        if (path.length === 0 && this.target) {
            console.error('Duplicate route found');
            return;
        }

        if (path.length === 0) {
            this.target = target;
            return;
        }

        if (this.parent === null && path[0] === '') {
            // If the path is empty, we are at the root node
            console.debug('Adding target to root node');
            this.target = target;
            return;
        }

        // Check if the path already exists
        const currentPath = path[0];
        const child = this.children.get(currentPath);

        if (!child) {
            // If the path does not exist, create a new node with rest of the path
            const newNode = new ForwardingNode(this);
            this.children.set(currentPath, newNode);
            newNode.addChild(path.slice(1), target);
        } else {
            // If the path exists, add the rest of the path to the existing node
            child.addChild(path.slice(1), target);
        }
    }

    findRoute(path: string[]): { target: string, path: string } | undefined {
        console.debug('Looking for route: ', path);
        if (path.length === 0 && this.target) {
            return { target: this.target, path: '' };
        }

        const currentPath = path[0];
        const child = this.children.get(currentPath);

        if (child) {
            console.debug('Child found, moving to next level');
            return child.findRoute(path.slice(1));
        }

        if (this.target) {
            console.debug('No child found, returning target: ', this.target);
            return { target: this.target, path: path.join('/') };
        }

        console.error('Route not found');
        return undefined;
    }

    printNode() {
        let result: any = {}
        if (this.target && this.parent !== null) {
            result = {
                target: this.target
            };
        }
        this.children.forEach((child, key) => {
            result[key] = child.printNode();
        });
        return result;
    }
}
