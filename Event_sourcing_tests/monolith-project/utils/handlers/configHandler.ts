import {
    SHARD,
    Event,
    Config,
    Rule,
    defaultRule,
} from '@src/control-plane/interfaces';

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
            console.log("Creating extraction callback function for topic:", conf.topic);
            console.log("Rules:", conf.shardKeyProducer);
            const callback = eval(conf.shardKeyProducer);
            this.rule_map.set(conf.topic, callback);
        }
        for (const filter of filters){
            console.info("Adding filter");
            console.info("Filter :", filter);
            this.addFilter(filter);
        }
    }

    addFilter(parameters: string[]){
         let b:boolean = this.filter_tree.addFilter(parameters);
         if (b){
            console.log("filter successfully added : ", parameters);
         } else {
            console.log("Failed to add filter : ", parameters);
         }
    }

    /**
     * Match the event with the corresponding rule
     *
     * @param event
     * @returns Rule
     */
    matchRule(event: Event): Rule {
        console.debug("Event:", event);
        const callback = this.rule_map.get(event.topic);
        if (!callback) {
            console.error('No extraction callback found');
            return this.filter_tree.getDefault();
        }

        const extracted_data = callback(event.message.value);
        console.info("EXTRACTED DATA : ", extracted_data);
        const result = this.filter_tree.getFilter(extracted_data);
        console.log(result);

        return result;
    }
}

interface FilterTree{

    addFilter(parameters: string[]): boolean;

    getFilter(parameters: string[]): Rule;
}

class FilterNodes implements FilterTree{

    nodes: Map<string, FilterTree>;
    depth: number;

    constructor(depth: number = 0) {
        this.nodes = new Map();
        this.nodes.set("default", new FilterLeaf(defaultRule))
        this.depth = depth;
    }


    addFilter(parameters: string[]): boolean {
        if (parameters.length != 4){
            console.error("Invalid filter config length : ", parameters);
            return false;
        }

        if (parameters[3] == "*") parameters[3] = JSON.stringify(defaultRule);
        
        let current_val = parameters[this.depth];
        if (!this.nodes.has(current_val)) {
            
            if (this.depth != 2 && current_val != "*"){
                let new_filter =  new FilterNodes(this.depth + 1)
                this.nodes.set(current_val, new_filter);
                return new_filter.addFilter(parameters);
            } else {
                if (current_val == "*") current_val = "default";
                this.nodes.set(current_val, new FilterLeaf(JSON.parse(parameters[3])));
                return true;   
            }
        }else {

            let target: FilterTree | undefined = this.nodes.get(current_val);
            if (!target) {
                console.error("Error in the target retreival, addFilter Method");
                return false;
            }

            return target.addFilter(parameters);
        }


    }


    getFilter(parameters: string[]): Rule {
        if (parameters.length != 3){
            throw new Error(`Invalid getFilter content : ${parameters}`);
        }
        let next_node = this.nodes.get(parameters[this.depth]);
        if (!next_node){
            next_node = this.nodes.get("default");
            if (!next_node){
                throw new Error("Node not found when retreiving filter");
            }
        }
        return next_node.getFilter(parameters);
    }

    getDefault(): Rule{
        let def = this.nodes.get("default");
        if (!def){
             throw new Error("failed to get default");
        }
        return def.getFilter([]);
    }
}

class FilterLeaf implements FilterTree {

    rule: JSON;

    constructor(filter: JSON){
        this.rule = filter;
    }

    addFilter(parameters: string[]): boolean {
        if (parameters.length != 4){
            console.error("Invalid filter config length : ", parameters);
            return false;
        }

        this.rule = JSON.parse(parameters[3]);
        return true;
    }

    getFilter(parameters: string[]): Rule {
        let to_return = this.rule as unknown as Rule;
        return to_return;

    }

}


