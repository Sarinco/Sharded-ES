(value) => {
    value = JSON.parse(value);
    return ["stock", "warehouse", value.data.warehouse]
}
