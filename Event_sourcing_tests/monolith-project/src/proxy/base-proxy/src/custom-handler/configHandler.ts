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
    private forward_map: Map<string, Map<string, string>>;
    private control_plane: ControlPlane;


    constructor(control_plane: ControlPlane) {
        this.control_plane = control_plane;
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
            console.log("Creating callback function for topic:", conf.topic);
            console.log("Rules:", conf.rules);
            const callback = eval(conf.rules);
            this.rule_map.set(conf.topic, callback);
            this.forward_map.set(conf.topic, new Map());
        }
    }

    newShard(result: any, topic: string) {
        const forward_map = this.forward_map.get(topic);
        if (!forward_map) {
            console.error('Forward map not found');
        }

        forward_map?.set(result.id, result.region);
        this.control_plane.newShardAdvertisement(result.region, result.id);
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
            console.log('No callback found');
            return defaultRule(event);
        }
        const result = callback(event.message.value);
        if (result.action == NEW_SHARD) {
            this.newShard(result, event.topic);
        }

        return result;
    }
}
