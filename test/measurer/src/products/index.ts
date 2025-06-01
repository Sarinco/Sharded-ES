
export async function getProducts(gateway: string) {
    const params = {
        headers: {
            'Content-Type': 'application/json',
        },
    };
    const url = `${gateway}/api/products`;
    const res = await fetch(url, {
        method: 'GET',
        ...params,
    });
    if (res.status != 200) {
        throw new Error(`Failed to get products: ${res.status} ${res.statusText}`);
    }
    return res.json();
}

export async function postProduct(gateway: string, random_price: number, token: string) {


    const payload = JSON.stringify({
        name: "Test Product",
        description: "This is a test product",
        image: "https://example.com/image.jpg",
        price: random_price,
        category: "Test Category",
    });

    const params = {
        headers: {
            'Content-Type': 'application/json',
            'authorization': token,
        },
    };
    const url = `${gateway}/api/products`;
    const res = await fetch(url, {
        method: 'POST',
        body: payload,
        ...params,
    });

    if (res.status != 200) {
        throw new Error(`Failed to post product: ${res.status} ${res.statusText}`);
    }

    return res.json();
}

export async function deleteProduct(gateway: string, productId: string, token: string) {
    const params = {
        headers: {
            'Content-Type': 'application/json',
            'authorization': token,
        },
    };
    const url = `${gateway}/api/products/${productId}`;
    const res = await fetch(url, {
        method: 'DELETE',
        ...params,
    });
    if (res.status != 200) {
        throw new Error(`Failed to delete product: ${res.status} ${res.statusText}`);
    }
}

export async function updateProduct(gateway: string, productId: string, random_price: number, token: string) {
    const payload = JSON.stringify({
        name: "Test Product",
        description: "This is a test product",
        image: "https://example.com/image.jpg",
        price: random_price,
    });
    const params = {
        headers: {
            'Content-Type': 'application/json',
            'authorization': token,
        },
    };
    const url = `${gateway}/api/products/${productId}`;
    const res = await fetch(url, {
        method: 'PUT',
        body: payload,
        ...params,
    });
    if (res.status != 200) {
        throw new Error(`Failed to update product: ${res.status} ${res.statusText}`);
    }
}
