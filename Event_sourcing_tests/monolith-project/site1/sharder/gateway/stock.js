(value) => {
    value = JSON.parse(value); 
    
    const url = value.url.split("/");
    console.debug("Url: ", url);
    const info = url[url.length - 1].split("?");
    console.debug("Info: ", info);

    if (info.length < 2) {
        console.error("No info to determine warehouse");
        return [];
    }
    const product = info[0];
    console.debug("Product: ", product);
    const warehouse = info[1].split("=")[1];

    return ["stock", "warehouse", warehouse]; 
}
