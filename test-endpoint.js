const https = require('https');

function request(method, path) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'agroapp-black.vercel.app',
            port: 443,
            path: path,
            method: method,
            headers: {
                'Content-Type': 'application/json',
                'Origin': 'http://localhost:8081' // Simulate Expo
            }
        };

        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                resolve({
                    statusCode: res.statusCode,
                    headers: res.headers,
                    body: data
                });
            });
        });

        req.on('error', (e) => reject(e));
        if (method === 'POST') {
            req.write(JSON.stringify({ phone: '123', password: '123' }));
        }
        req.end();
    });
}

async function test() {
    console.log("--- Testing ROOT ---");
    try {
        const res = await request('GET', '/');
        console.log(`Status: ${res.statusCode}`);
        // console.log("Body snippet:", res.body.substring(0, 100)); 
    } catch (e) {
        console.error("ROOT Error:", e);
    }

    console.log("--- Testing PING (Pages Router) ---");
    try {
        const res = await request('GET', '/api/ping_pages');
        console.log(`Status: ${res.statusCode}`);
        if (res.statusCode === 200) console.log("Body:", res.body);
    } catch (e) {
        console.error("PING PAGES Error:", e);
    }

    console.log("--- Testing PING (App Router) ---");
    try {
        const res = await request('GET', '/api/ping');
        console.log(`Status: ${res.statusCode}`);
        if (res.statusCode === 200) console.log("Body:", res.body);
    } catch (e) {
        console.error("PING APP Error:", e);
    }

    console.log("--- Testing LOGIN (App Router) ---");
    try {
        const res = await request('POST', '/api/v1/auth/login');
        console.log(`Status: ${res.statusCode}`);
    } catch (e) {
        console.error("LOGIN Error:", e);
    }

    console.log("--- Testing LOGIN OPTIONS (App Router) ---");
    try {
        const res = await request('OPTIONS', '/api/v1/auth/login');
        console.log(`Status: ${res.statusCode}`);
        console.log("Headers:", res.headers);
    } catch (e) {
        console.error("LOGIN OPTIONS Error:", e);
    }

    console.log("--- Testing MIDDLEWARE (Diagnostic) ---");
    try {
        const res = await request('GET', '/api/mw-ping');
        console.log(`Status: ${res.statusCode}`);
        if (res.statusCode === 200) console.log("Body:", res.body);
    } catch (e) {
        console.error("MIDDLEWARE Error:", e);
    }
}
test();
