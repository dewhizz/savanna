const http = require('http');

const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/js/jquery.js',
    method: 'GET'
};

const req = http.request(options, res => {
    console.log(`STATUS: ${res.statusCode}`);
    console.log(`HEADERS: ${JSON.stringify(res.headers)}`);

    // Consume response body to free up memory
    res.resume();
});

req.on('error', error => {
    console.error(`Problem with request: ${error.message}`);
});

req.end();
