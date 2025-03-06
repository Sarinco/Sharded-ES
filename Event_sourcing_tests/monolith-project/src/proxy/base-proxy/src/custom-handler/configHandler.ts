import { v4 as uuid } from 'uuid';
import {
    Event,
    Config,
    Rule,
    defaultRule
} from '@src/control-plane/interfaces';

export class ConfigManager {

    private rule_map: Map<string, Function>;
    private forward_map: Map<string, string>;


    constructor() {
        this.rule_map = new Map();
        this.forward_map = new Map();
    }


    /**
     * Recieve the config from the control plane
     * and parse it to store the rules already evaluated
     *
     * @param config
     */
    setConfig(config: Config[]) {
        console.log("Setting config");
        for (const conf of config) {
            const callback = eval(conf.rules);
            this.rule_map.set(conf.topic, callback);
        }
        console.log(this.rule_map.get('users')?.call("caca"));
    }
    
    /**
     * Match the event with the corresponding rule
     *
     * @param event
     * @returns Rule
     */
    matchRule(event: Event): Rule {
        const callback = this.rule_map.get(event.topic);
        if (!callback) {
            return defaultRule(event);
        }
        return callback(event);
    }
}
