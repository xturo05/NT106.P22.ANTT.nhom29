async function callApi(url, method = 'GET', token = null, body = null) {
    let headers = {
        'Content-Type': 'application/json',
    };
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    let res = await fetch(url, {
        method: method,  // <-- Giờ lấy theo tham số method
        headers: headers,
        body: method !== 'GET' && body ? JSON.stringify(body) : null,
    });

    if (res.status === 401 && localStorage.getItem('refresh')) {
        const newToken = await refreshToken();
        if (newToken) {
            return await callApi(url, method, newToken, body);
        }
    }

    return res.json();
}
