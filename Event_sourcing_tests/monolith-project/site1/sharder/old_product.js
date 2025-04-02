(event) => {
    event = JSON.parse(event);
    switch (event.type) {
        case 'ProductAdded':
            console.log("ProductAdded");
            switch (event.data.category) {
                case 'Fruits':
                    return {
                        action: 'new_shard',
                        id: event.data.id,
                        region: ['eu-be']
                    }
                case 'Vegetables':
                    return {
                        action: 'new_shard',
                        id: event.data.id,
                        region: ['eu-spain']
                    }
                default:
                    console.log("No case for this category: " + event.data.category);
                    break;
            }
            break;
        default:
            console.log("No case for this type: " + event.type);
            return {
                action: 'broadcast',
                id: -1
            }
    }
    console.log("No case for this event");
    return {
        action: 'broadcast',
        id: -1
    }
}
