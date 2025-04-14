async function refreshToken() {
    const refreshToken = localStorage.getItem('refresh');

    const res = await fetch('http://localhost:8000/api/token/refresh/', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refresh: refreshToken }),
    });

    if (res.ok) {
        const data = await res.json();
        localStorage.setItem('access', data.access);
        return data.access;
    } else {
        alert('Phiên đăng nhập hết hạn!');
        window.location.href = '/login';
        return null;
    }
}
