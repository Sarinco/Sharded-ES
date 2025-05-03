
const gateways = [
    "http://localhost:80",
    "http://localhost:81",
];

const admin_token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJlbWFpbCI6ImFkbWluQHRlc3QuYmUiLCJyb2xlIjoiYWRtaW4iLCJpYXQiOjE3NDAzMDY1NDAsImV4cCI6MTc1NTg1ODU0MH0.q-ZZUj3Tphe6NEMOZAqtSGu1ziIxPjBaABpbZrCU2y0";

function cleanProduct() {
    // Fetch the product data from the API
    const params = {
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `${admin_token}`,
        },
    };
    const url = `${gateways[0]}/api/products`;

    fetch(url, {
        method: 'GET',
        ...params,
    })
        .then(res => {
            if (res.status != 200) {
                throw new Error(`Failed to get all products: ${res.status} ${res.statusText}`);
            }
            return res.json();
        })
        .then(data => {
            // Filter the products that were created during the test
            const productsToDelete = data.filter((product: any) => product.name === "Test Product");
            // Delete each product
            productsToDelete.forEach((product: any) => {
                const deleteUrl = `${gateways[0]}/api/products/${product.id}`;
                fetch(deleteUrl, {
                    method: 'DELETE',
                    ...params,
                })
                    .then(res => {
                        if (res.status != 200) {
                            throw new Error(`Failed to delete product (${product.id}): ${res.status} ${res.statusText}`);
                        }
                        console.log(`Product ${product.id} deleted successfully`);
                    });
            });
            return data.filter((product: any) => product.name !== "Test Product");
        });
}

function cleanStock(remainingProducts: any[]) {
    remainingProducts.forEach((product: any) => {
        const deleteUrl = `${gateways[0]}/api/stock/${product.id}`;
        fetch(deleteUrl, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `${admin_token}`,
            },
        })
            .then(res => {
                if (res.status != 200) {
                    throw new Error(`Failed to delete stock (${product.id}): ${res.status} ${res.statusText}`);
                }
                console.log(`Stock for product ${product.id} deleted successfully`);
            });
    });
}


let remaingProducts = cleanProduct();

