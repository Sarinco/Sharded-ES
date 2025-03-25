(event) => {
    event = JSON.parse(event);
    const result = {
        action: 'shard',
        region: ['eu-be'],
        ask_all: false
    };
    if (event.type == "GetStock" && event.data.warehouse == undefined) {
        result.ask_all = true;
    }

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
            result.region = ['eu-be'];
            return result;
        case 'barcelona':
        case 'madrid':
        case 'seville':
        case 'valencia':
            result.region = ['eu-spain'];
            return result;
        default:
            console.log("No case for this type: " + event.type);
            return result;
    }
    console.log("No case for this event");
    return {
        action: 'shard',
        region: ['eu-be']
    }
}
