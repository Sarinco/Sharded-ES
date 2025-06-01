
export async function loginUser(gateway: string, username: string, password: string) {
    const payload = JSON.stringify({
        email: username,
        password: password,
    });

    const params = {
        headers: {
            'Content-Type': 'application/json',
        },
    };

    const url = `${gateway}/api/users/login`;
    const res = await fetch(url, {
        method: 'POST',
        body: payload,
        ...params,
    });

    if (res.status != 200) {
        throw new Error(`Failed to login: ${res.status} ${res.statusText}`);
    }

    const token = res.headers.get('authorization');

    if (!token) {
        throw new Error('Failed to login: no token received');
    }
    return token;
}

export async function adminLogin(gateway: string) {
    return loginUser(
        gateway,
        'admin@test.be',
        'admin',
    );
}

export async function registerUser(gateway: string, email: string, password: string) {
    const payload = JSON.stringify({
        email,
        password
    });
    const params = {
        headers: {
            'Content-Type': 'application/json',
        },
    };
    const url = `${gateway}/api/users/register`;

    const res = await fetch(url, {
        method: 'POST',
        body: payload,
        ...params,
    });
    if (res.status != 201) {
        throw new Error(`Failed to register: ${res.status} ${res.statusText}`);
    }

    const token = res.headers.get('authorization');
    if (!token) {
        throw new Error('Failed to register: no token received');
    }
    return token;
}

export async function deleteUser(gateway: string, email: string, token: string) {
    const params = {
        headers: {
            'Content-Type': 'application/json',
            'Authorization': token,
        },
    };
    const url = `${gateway}/api/users/${email}`;

    const res = await fetch(url, {
        method: 'DELETE',
        ...params,
    });
    if (res.status != 200) {
        throw new Error(`Failed to delete user: ${res.status} ${res.statusText}`);
    }
}
