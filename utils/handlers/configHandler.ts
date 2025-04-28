import {
    SHARD,
    Event,
    Config,
    Rule,
    defaultAction,
    BROADCAST,
} from '@src/control-plane/interfaces';

/*
* This class handles the filter tree and the filter matching when an
* event is received by the proxy
*/
export class ConfigManager {

    private rule_map: Map<string, Function>;
    private filter_tree: FilterNodes;

    constructor() {
        this.rule_map = new Map();
        this.filter_tree = new FilterNodes();
    }

    /**
     * Recieve the config from the control plane on how to extract 
     * useful data from the events
     *
     * @param config
     */
    setConfig(config: Config[], filters: string[][] = []) {
        console.info("Setting config");
        for (const conf of config) {
            console.info("Creating extraction callback function for topic:", conf.topic);
            console.info("Rules:", conf.shardKeyProducer);
            const callback = eval(conf.shardKeyProducer);
            this.rule_map.set(conf.topic, callback);
        }
        for (const filter of filters) {
            console.info("Adding filter");
            console.info("Filter :", filter);
            this.addFilter(filter);
        }
    }

    /**
     * Add a filter to the filter tree
     *
     * @param parameters
     */
    addFilter(parameters: string[]): boolean {
        let b: boolean = this.filter_tree.addFilter(parameters);
        if (!b) {
            console.error("Failed to add filter : ", parameters);
        }
        return b;
    }

    /**
     * Match the event with the corresponding extraction callback
     *
     * @param event
     * @returns Rule
     */
    matchCallback(event: Event) {
        console.debug("Event:", event);
        const callback = this.rule_map.get(event.topic);
        console.debug("Callback:", callback);
        if (!callback) {
            console.error('No extraction callback found');
            return this.filter_tree.getDefault();
        }

        const extracted_data = callback(event.message.value);
        console.debug('Extracted data:', extracted_data);
        return extracted_data;
    }

    matchFilter(extracted_data: any): Rule {
        const target_regions = this.filter_tree.getRule(extracted_data);
        if (target_regions.length == 1 && target_regions[0] == BROADCAST) {
            return { action: BROADCAST };
        }
        const generated_filter: Rule = { action: SHARD, region: target_regions };
        return generated_filter;
    }

    deleteFilter(parameters: string[]): boolean {
        let b: boolean = this.filter_tree.deleteFilter(parameters);
        if (!b) {
            console.log("Failed to remove filter, filter not found : ", parameters);
        }
        return b;
    }

    /**
     * Match the event with the corresponding rule
     *
     * @param event
     * @returns Rule
     */
    matchRule(event: Event): Rule {
        const extracted_data = this.matchCallback(event);
        return this.matchFilter(extracted_data);
    }
}

interface FilterTree {

    addFilter(parameters: string[]): boolean;

    deleteFilter(parameters: string[]): boolean;

    getRule(parameters: string[]): string[];

    getSize(): number;
}

class FilterNodes implements FilterTree {

    nodes: Map<string, FilterTree>;
    depth: number;

    constructor(depth: number = 0) {
        this.nodes = new Map();
        this.nodes.set("default", new FilterLeaf(defaultAction))
        this.depth = depth;
    }

    getSize(): number {
        return this.nodes.size
    }

    addFilter(parameters: string[]): boolean {
        if (parameters.length != 4) {
            console.error("Invalid filter config length : ", parameters);
            return false;
        }

        if (parameters[3] == "*") parameters[3] = defaultAction;

        let current_val = parameters[this.depth];
        if (!this.nodes.has(current_val)) {

            if (this.depth != 2 && current_val != "*" && current_val != "%") {
                let new_filter = new FilterNodes(this.depth + 1)
                this.nodes.set(current_val, new_filter);
                return new_filter.addFilter(parameters);
            } else {
                if (current_val == "*") current_val = "default";
                this.nodes.set(current_val, new FilterLeaf(parameters[3]));
                return true;
            }
        } else {

            let target: FilterTree | undefined = this.nodes.get(current_val);
            if (!target) {
                console.error("Error in the target retreival, addFilter Method");
                return false;
            }

            return target.addFilter(parameters);
        }


    }

    deleteFilter(parameters: string[]): boolean {
        if (parameters.length != 3) {
            console.log("Invalid parameters size for filter removal");
            return false;
        }

        let current_val = parameters[this.depth];
        if (!this.nodes.has(current_val) && current_val != "*") {
            return false;
        }

        if (current_val == "*") {
            this.nodes.set("default", new FilterLeaf(defaultAction));
            console.log("default filter reverted back to original parameters");
            return true;
        }

        let size = this.nodes.get(current_val)!.getSize();
        if (size <= 1) {
            this.nodes.delete(current_val);
            return true;
        } else {
            return this.nodes.get(current_val)!.deleteFilter(parameters);
        }
    }


    getRule(parameters: string[]): string[] {
        if (parameters.length == 0) {
            return this.getDefault();
        }

        if (parameters.length != 3) {
            throw new Error(`Invalid getFilter content : ${parameters}`);
        }

        let next_node = this.nodes.get(parameters[this.depth]);
        if (!next_node) {
            next_node = this.nodes.get("default");
            if (!next_node) {
                throw new Error("Node not found when retreiving filter");
            }
        }

        let mandatory_node = this.nodes.get("%");
        if (mandatory_node) {
            return next_node.getRule(parameters).concat(mandatory_node.getRule(parameters))
        } else {
            return next_node.getRule(parameters);
        }
    }

    getDefault(): string[] {
        let def = this.nodes.get("default");
        if (!def) {
            throw new Error("failed to get default");
        }
        return def.getRule([]);
    }
}

class FilterLeaf implements FilterTree {

    rule: string[];

    constructor(action: string) {
        this.rule = action.split(",");
    }

    getSize(): number {
        return 0;
    }

    addFilter(parameters: string[]): boolean {
        if (parameters.length != 4) {
            console.error("Invalid filter config length : ", parameters);
            return false;
        }
        let new_rule = parameters[3].split(",");
        this.rule = this.rule.concat(new_rule);
        return true;
    }

    deleteFilter(parameters: string[]): boolean {

        return false;
    }

    getRule(parameters: string[]): string[] {
        return this.rule;
    }

}


