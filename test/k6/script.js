import http from 'k6/http';
import { sleep, check } from 'k6';

const GATEWAY_1 = 'http://localhost:80';
const GATEWAY_2 = 'http://localhost:81';

export const options = {
    // Add stages for ramp-up/down testing
    stages: [
        { duration: '0s', target: 0 },  // Ramp-up
        { duration: '4s', target: 2 },   // Sustained load
        { duration: '0s', target: 0 },   // Ramp-down
    ],
};


function setup() {
    const payload = JSON.stringify({
        email: 'admin@test.be',
        password: 'admin',
    });

    const params = {
        headers: {
            'Content-Type': 'application/json',
        },
    };
    let res = http.post(GATEWAY_1 + '/api/users/login', payload, params, { tags: { topic: 'users', endpoint: 'login' } });

    let token = res.headers['Authorization'];
    check(res, {
        'Successful login': (r) => r.status === 200,
    });

    return {
        token: token,
    };
}


function createProduct(token, randomPrice) {
    const payload = JSON.stringify({
        name: 'Product 1',
        price: randomPrice,
        description: 'Description of Product 1',
        image: 'https://example.com/image1.jpg',
        category: 'Category 1',
    });

    const params = {
        headers: {
            'Content-Type': 'application/json',
            'authorization': token,
        },
    };

    let res = http.post(GATEWAY_1 + '/api/products', payload, params, { tags: { topic: 'product', endpoint: '/' } });

    check(res, {
        'Product created': (r) => {
            return r.status === 200;
        },
    });

    let jason = res.json();
    let id = jason.id;
    return id;
}

function updateProduct(token, randomPrice, productId) {
    const payload = JSON.stringify({
        name: 'Product 1',
        price: randomPrice,
        description: 'Description of Product 1',
        image: 'https://example.com/image1.jpg',
        category: 'Category 1',
    });

    const params = {
        headers: {
            'Content-Type': 'application/json',
            'authorization': token,
        },
    };

    let res = http.put(GATEWAY_1 + '/api/products/' + productId, payload, params, { tags: { topic: 'product', endpoint: '/' } });

    check(res, {
        'Product updated': (r) => r.status === 200,
    });
}

function deleteProduct(token, productId) {
    const params = {
        headers: {
            'Content-Type': 'application/json',
            'authorization': token,
        },
    };

    let res = http.del(GATEWAY_1 + '/api/products/' + productId, null, params, { tags: { topic: 'product', endpoint: '/' } });

    check(res, {
        'Product deleted': (r) => r.status === 200,
    });
}



export default function() {
    const delay = 1;
    let token = setup().token;

    let randomPrice = Math.floor(Math.random() * 100) + 1;

    let id = createProduct(token, randomPrice);

    sleep(delay);
    let res = http.get('' + GATEWAY_1 + '/api/products', { tags: { topic: 'product', endpoint: '/' } });
    check(res, {
        'Product recieved': (r) => r.status === 200,
        'Product is in the list': (r) => {
            let products = r.json();
            let found = false;
            for (let i = 0; i < products.length; i++) {
                if (products[i].id === id) {
                    found = true;
                    break;
                }
            }
            return found;
        },
        'Product price is correct': (r) => {
            let products = r.json();
            let found = false;
            for (let i = 0; i < products.length; i++) {
                if (products[i].id === id && products[i].price === randomPrice) {
                    found = true;
                    break;
                }
            }
            return found;
        }
    });

    randomPrice = Math.floor(Math.random() * 100) + 1;
    updateProduct(token, randomPrice, id);

    sleep(delay);
    res = http.get('' + GATEWAY_1 + '/api/products', { tags: { topic: 'product', endpoint: '/' } });
    check(res, {
        'Product updated': (r) => r.status === 200,
        'Product price is updated': (r) => {
            let products = r.json();
            let found = false;
            for (let i = 0; i < products.length; i++) {
                if (products[i].id === id && products[i].price === randomPrice) {
                    found = true;
                    break;
                }
            }
            return found;
        }
    });

    deleteProduct(token, id);

    sleep(delay);
    res = http.get('' + GATEWAY_1 + '/api/products', { tags: { topic: 'product', endpoint: '/' } });
    check(res, {
        'Product deleted': (r) => r.status === 200,
        'Product is not in the list': (r) => {
            let products = r.json();
            let found = false;
            for (let i = 0; i < products.length; i++) {
                if (products[i].id === id) {
                    found = true;
                    break;
                }
            }
            return !found;
        }
    });
    sleep(1);
}
