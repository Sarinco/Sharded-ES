import { v4 as uuid } from 'uuid';

interface Filter {
    name: string;
    proxy_address: string;
    region: string;
    topic: string;
    filters: Array<JSON>;
}

interface Event {
    topic: string;
    region: string;
    message: string;
}

export function replaceAddress(input: string, ip: string) {
    const inputJson: Array<Filter> = JSON.parse(input);

    // Iterate over the json array and change the proxy_address var to ip
    inputJson.forEach(element => {
        element.proxy_address = ip;
    });

    return inputJson;
}

export class FilterManager {
    private filterId_to_filter: Map<string, Filter>;

    private proxyAddress_to_filterId: Map<string, Array<string>>;
    private topicRegion_to_filterId: Map<string, Array<string>>;

    constructor() {
        this.filterId_to_filter = new Map();
        this.proxyAddress_to_filterId = new Map();
        this.topicRegion_to_filterId = new Map();
    }

    addFilter(filters: Array<Filter>) {
        /* Add a filter to the filter map */
        console.log("Filters: ", filters);
        filters.forEach(filter => {
            const filterId = uuid();
            this.filterId_to_filter.set(filterId, filter);

            if (this.proxyAddress_to_filterId.has(filter.proxy_address)) {
                this.proxyAddress_to_filterId.get(filter.proxy_address)?.push(filterId);
            } else {
                this.proxyAddress_to_filterId.set(filter.proxy_address, [filterId]);
            }

            const topicRegion = filter.topic + ":" + filter.region;
            if (this.topicRegion_to_filterId.has(topicRegion)) {
                this.topicRegion_to_filterId.get(topicRegion)?.push(filterId);
            } else {
                this.topicRegion_to_filterId.set(topicRegion, [filterId]);
            }
        });
    }

    matchFilter(event: Event): Array<string> {
        /* Match an event to a filter */
        const topicRegion = [event.topic + ":" + event.region];
        topicRegion.push(event.topic + ":*");
        topicRegion.push("*:" + event.region);
        topicRegion.push("*:*");
        const ip_address: Array<string> = [];

        for (const tr of topicRegion) {
            const filterIds = this.topicRegion_to_filterId.get(tr);
            if (!filterIds) {
                continue
            }
            for (const filterId of filterIds) {
                const filter = this.filterId_to_filter.get(filterId);
                if (!filter) {
                    continue;
                }
                if (ip_address.includes(filter.proxy_address)) {
                    continue;
                }
                ip_address.push(filter.proxy_address);
            }

        }

        return ip_address;
    }

    private removeFilter(filterId: string) {
        /* Remove a filter from the filter map */
        const filter = this.filterId_to_filter.get(filterId);
        if (filter) {
            this.filterId_to_filter.delete(filterId);

            const topicRegion = filter.topic + ":" + filter.region;
            this.topicRegion_to_filterId.get(topicRegion)?.splice(this.topicRegion_to_filterId.get(topicRegion)?.indexOf(filterId) as number, 1);
        }
    }

    removeFiltersByProxyAddress(proxyAddress: string) {
        /* Remove all filters with a specific proxy address */
        const filterIds = this.proxyAddress_to_filterId.get(proxyAddress);
        if (filterIds) {
            filterIds.forEach(filterId => {
                this.removeFilter(filterId);
            });
        }
        this.proxyAddress_to_filterId.delete(proxyAddress);
    }
}