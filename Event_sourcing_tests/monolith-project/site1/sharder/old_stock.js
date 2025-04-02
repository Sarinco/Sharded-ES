(event) => {
    event = JSON.parse(event);
    switch (event.data.warehouse) {
        case 'charleroi':
        case 'charleroi-ouest':
        case 'charleroi-est':
        case 'charleroi-sud':
        case 'charleroi-nord':
        case 'louvain-west':
        case 'louvain-east':
        case 'louvain-south':
        case 'louvain-north':
        case 'louvain':
            return {
                action: 'shard',
                region: ['eu-be']
            }
        case 'barcelona':
        case 'madrid':
        case 'seville':
        case 'valencia':
            return {
                action: 'shard',
                region: ['eu-spain']
            }

        default:
            console.log("No case for this type: " + event.type);
            return {
                action: 'shard',
                region: ['eu-be']
            }
    }
    console.log("No case for this event");
    return {
        action: 'shard',
        region: ['eu-be']
    }
}
