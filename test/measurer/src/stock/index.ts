
export async function getAllStock(gateway: string) {
    const params = {
        headers: {
            'Content-Type': 'application/json',
        },
    };
    const url = `${gateway}/api/stock`;
    const res = await fetch(url, {
        method: 'GET',
        ...params,
    });
    if (res.status != 200) {
        throw new Error(`Failed to get all stock: ${res.status} ${res.statusText}`);
    }
    const data = await res.json();
    return data;
}

export async function getStock(gateway: string, id: string) {
    const params = {
        headers: {
            'Content-Type': 'application/json',
        },
    };
    const url = `${gateway}/api/stock/${id}`;
    const res = await fetch(url, {
        method: 'GET',
        ...params,
    });
    if (res.status != 200) {
        throw new Error(`Failed to get stock: ${res.status} ${res.statusText}`);
    }
    const data = await res.json();
    return data;
}

export async function getStockOfWarehouse(gateway: string, id: string, warehouse: string) {
    const params = {
        headers: {
            'Content-Type': 'application/json',
        },
    };
    const url = `${gateway}/api/stock/${id}?warehouse=${warehouse}`;
    const res = await fetch(url, {
        method: 'GET',
        ...params,
    });
    if (res.status != 200) {
        throw new Error(`Failed to get stock by warehouse: ${res.status} ${res.statusText}`);
    }
    const data = await res.json();
    return data;
}

export async function setStock(gateway: string, id: string, warehouse: string, count: number, token: string) {
    const payload = JSON.stringify({
        count,
        warehouse,
    });

    const params = {
        headers: {
            'Content-Type': 'application/json',
            'Authorization': token,
        },
    };
    const url = `${gateway}/api/stock/${id}`;
    const res = await fetch(url, {
        method: 'PUT',
        body: payload,
        ...params,
    });

    if (res.status != 200) {
        throw new Error(`Failed to add stock: ${res.status} ${res.statusText}`);
    }
}

export async function increaseStock(gateway: string, id: string, warehouse: string, count: number, token: string) {
    const payload = JSON.stringify({
        count,
        warehouse,
    });

    const params = {
        headers: {
            'Content-Type': 'application/json',
            'Authorization': token,
        },
    };
    const url = `${gateway}/api/stock/${id}/increase`;
    const res = await fetch(url, {
        method: 'PUT',
        body: payload,
        ...params,
    });

    if (res.status != 200) {
        throw new Error(`Failed to increase stock: ${res.status} ${res.statusText}`);
    }
}

export async function decreaseStock(gateway: string, id: string, warehouse: string, count: number, token: string) {
    const payload = JSON.stringify({
        count,
        warehouse,
    });

    const params = {
        headers: {
            'Content-Type': 'application/json',
            'Authorization': token,
        },
    };
    const url = `${gateway}/api/stock/${id}/decrease`;
    const res = await fetch(url, {
        method: 'PUT',
        body: payload,
        ...params,
    });

    if (res.status != 200) {
        throw new Error(`Failed to decrease stock: ${res.status} ${res.statusText}`);
    }
}

export async function deleteStock(gateway: string, id: string, warehouse: string, token: string) {
    const payload = JSON.stringify({
        warehouse,
    });
    const params = {
        headers: {
            'Content-Type': 'application/json',
            'Authorization': token,
        },
    };
    const url = `${gateway}/api/stock/${id}`;
    const res = await fetch(url, {
        method: 'DELETE',
        body: payload,
        ...params,
    });

    if (res.status != 200) {
        throw new Error(`Failed to delete stock: ${res.status} ${res.statusText}`);
    }
}
