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
    console.log("--- Testing OPTIONS ---");
    try {
        const res = await request('OPTIONS', '/api/v1/auth/login');
        console.log(`Status: ${res.statusCode}`);
        console.log("Headers:", JSON.stringify(res.headers, null, 2));
    } catch (e) {
        console.error("OPTIONS Error:", e);
    }

    console.log("\n--- Testing PING ---");
    try {
        const res = await request('GET', '/api/ping');
        console.log(`Status: ${res.statusCode}`);
        console.log("Body:", res.body);
    } catch (e) {
        console.error("PING Error:", e);
    }

    console.log("\n--- Testing POST ---");
    try {
        const res = await request('POST', '/api/v1/auth/login');
        console.log(`Status: ${res.statusCode}`);
        console.log("Body snippet:", res.body.substring(0, 100));
    } catch (e) {
        console.error("POST Error:", e);
    }
}

test();
