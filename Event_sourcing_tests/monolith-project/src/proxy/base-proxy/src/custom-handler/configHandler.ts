import { v4 as uuid } from 'uuid';
import {
    Event,
    Config,
    Rule,
    defaultRule,
    NEW_SHARD
} from '@src/control-plane/interfaces';
import { ControlPlane } from '@src/control-plane/control-plane';

export class ConfigManager {

    private rule_map: Map<string, Function>;
    private control_plane: ControlPlane;


    constructor(control_plane: ControlPlane) {
        this.control_plane = control_plane;
        this.rule_map = new Map();

        // setup connection to mapping db
        const db_map_address = process.env.EVENT_DB;
        const db_port = "6379";
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
            console.log("Creating callback function for topic:", conf.topic);
            console.log("Rules:", conf.rules);
            const callback = eval(conf.rules);
            this.rule_map.set(conf.topic, callback);
        }
    }

    /**
     * Match the event with the corresponding rule
     *
     * @param event
     * @returns Rule
     */
    matchRule(event: Event): Rule {
        console.log("Event:", event);
        const callback = this.rule_map.get(event.topic);
        if (!callback) {
            console.log('No callback found, using default filter configs');
            return defaultRule(event);
        }
        const result = callback(event.message.value);

        return result;
    }
}
