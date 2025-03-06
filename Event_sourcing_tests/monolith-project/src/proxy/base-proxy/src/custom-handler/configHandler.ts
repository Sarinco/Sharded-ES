import { v4 as uuid } from 'uuid';
import {
    Event,
    Config,
    BROADCAST, 
} from '@src/control-plane/interfaces';

export class ConfigManager {

    private rule_map: Map<string, Function>;
    private forward_map: Map<string, string>;

    constructor() {
        this.rule_map = new Map();
        this.forward_map = new Map();
    }


    setConfig(config: Config[]) {
        console.log("Setting config");
        for (const conf of config) {
            const callback = eval(conf.rules);
            this.rule_map.set(conf.topic, callback);
        }
        console.log(this.rule_map.get('users')?.call("caca"));
    }

}
