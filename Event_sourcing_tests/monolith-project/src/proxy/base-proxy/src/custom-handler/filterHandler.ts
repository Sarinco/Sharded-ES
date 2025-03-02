import { v4 as uuid } from 'uuid';
import {
    Filter,
    Event
} from '@src/control-plane/interfaces';


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

    // Overloaded function signatures
    addFilter(filters: Array<Filter>): void; // Accepts an array of filters
    addFilter(filter: Filter): void; // Accepts a single filter object
    addFilter(filters: Filter | Array<Filter>): void {
        /* Handle both a single filter or an array of filters */
        if (Array.isArray(filters)) {
            // If it's an array, process each filter
            filters.forEach(filter => this.addSingleFilter(filter));
        } else {
            // If it's a single filter, process it
            this.addSingleFilter(filters);
        }
    }

    private addSingleFilter(filter: Filter): void {
        /* Adds a single filter to the filter map */
        const filterId = uuid();
        this.filterId_to_filter.set(filterId, filter);

        // Handle proxy address mapping
        if (this.proxyAddress_to_filterId.has(filter.proxy_address)) {
            this.proxyAddress_to_filterId.get(filter.proxy_address)?.push(filterId);
        } else {
            this.proxyAddress_to_filterId.set(filter.proxy_address, [filterId]);
        }

        // Handle topic-region mapping
        const topicRegion = filter.topic + ":" + filter.region;
        if (this.topicRegion_to_filterId.has(topicRegion)) {
            this.topicRegion_to_filterId.get(topicRegion)?.push(filterId);
        } else {
            this.topicRegion_to_filterId.set(topicRegion, [filterId]);
        }
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
                console.log("No filter found for topicRegion: ", tr);
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

    getAllFilters(): IterableIterator<Filter> {
        /* Return all filters */
        return this.filterId_to_filter.values();
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
