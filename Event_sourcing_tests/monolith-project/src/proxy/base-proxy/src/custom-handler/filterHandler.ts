
interface filter {
    name: string;
    proxy_address: string;
    region: string;
    topic: string;
    filters: Array<string>;
}

export function replaceAddress(input: string, ip: string) {
    const inputJson: Array<filter> = JSON.parse(input);

    // Iterate over the json array and change the proxy_address var to ip
    inputJson.forEach(element => {
       element.proxy_address = ip; 
    });

    return JSON.stringify(inputJson);
}
