import http from 'http';
import https from 'https';
import httpProxy from 'http-proxy';
import { buildNodeClient } from './tools/tequila';
import { log } from './tools/common';
import fs from 'fs';

const PROXY_PORT = 10003;

// Create a proxy server
const proxy = httpProxy.createProxyServer({});

// Load SSL certificate and key
const options = {
    key: fs.readFileSync('privkey.pem'), // Path to your private key
    cert: fs.readFileSync('fullchain.pem'), // Path to your certificate
};

// Create an HTTPS server
const httpsServer = https.createServer(options, async (req, res) => {
    await handleRequest(req, res);
});

// Create an HTTP server to redirect to HTTPS
const httpServer = http.createServer((req, res) => {
    res.writeHead(301, { Location: `https://${req.headers.host}${req.url}` });
    res.end();
});

// Function to handle requests
async function handleRequest(req:any, res:any) {
    console.log('Request Method:', req.method);
    console.log('Request Headers:', req.headers);

    const node = await buildNodeClient(20003); // Initialize node client
    try {
        await node.quickConnectTo("DE", { proxyPort: PROXY_PORT, retries: 3 });
        
        // Proxy the request
        proxy.web(req, res, {
            target: `http://95.217.234.2:${PROXY_PORT}`,
            changeOrigin: false, // Do not change the origin of the host header
            toProxy: true,
            prependPath: false,
        }, (error) => {
            console.error('Proxy error:', error);
            res.writeHead(502, { 'Content-Type': 'text/plain' });
            res.end('Bad Gateway');
        });
    } catch (error) {
        console.error('Connection error:', error);
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end('Internal Server Error');
    } finally {
        await node.cancelConnection(); // Ensure the connection is canceled
        log(`connection closed`);
    }
}

// Listen on a specific port for both HTTP and HTTPS
const PORT = 3000; // Change to your desired port

// httpServer.listen(PORT, () => {
//     console.log(`HTTP to HTTPS redirect server running on http://localhost:${PORT}`);
// });

httpsServer.listen(PORT, () => {
    console.log(`HTTPS Proxy server running on https://localhost:${PORT}`);
});