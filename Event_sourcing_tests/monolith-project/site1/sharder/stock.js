(event) => {
    event = JSON.parse(event);
    return ["stock", "warehouse", event.data.warehouse]
}