/**
 * Test the actual login endpoint via HTTP to see server-side console output
 */
const http = require('http');

const payload = JSON.stringify({ email: "sarah@rifah.sa", password: "test123" });

const options = {
    hostname: 'localhost',
    port: 5000,
    path: '/api/v1/auth/staff/login',
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload)
    }
};

const req = http.request(options, (res) => {
    let data = '';
    res.on('data', (chunk) => { data += chunk; });
    res.on('end', () => {
        console.log(`Status: ${res.statusCode}`);
        try {
            console.log('Response:', JSON.stringify(JSON.parse(data), null, 2));
        } catch {
            console.log('Raw:', data);
        }
    });
});

req.on('error', (e) => { console.error('Connection error:', e.message); });
req.write(payload);
req.end();
