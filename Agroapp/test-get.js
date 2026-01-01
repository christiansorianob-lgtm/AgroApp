const https = require('https');

const options = {
    hostname: 'agroapp-black.vercel.app',
    port: 443,
    path: '/api/v1/maquinaria/simple',
    method: 'GET'
};

const req = https.request(options, (res) => {
    console.log(`STATUS: ${res.statusCode}`);
    res.on('data', (chunk) => {
        console.log(`BODY: ${chunk.toString().substring(0, 100)}...`);
    });
});

req.on('error', (e) => {
    console.error(`problem with request: ${e.message}`);
});

req.end();
