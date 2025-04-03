import http from 'http';
import httpProxy from 'http-proxy';
import { buildNodeClient } from './tools/tequila';
import { log } from './tools/common';

const PROXY_PORT = 10003;

// Create a proxy server
const proxy = httpProxy.createProxyServer({});

// Create a server
const server = http.createServer(async (req, res) => {
    // Extract host and port from the request
    const host = req.headers.host; // e.g., "example.com:80"
    const target = `http://${host}`; // Construct target URL

    const node = await buildNodeClient(20003); // Initialize node client
    try {
        await node.quickConnectTo("DE", { proxyPort: PROXY_PORT, retries: 3 });

        // Proxy the request
        proxy.web(req, res, { target: `http://95.217.234.2:${PROXY_PORT}`, changeOrigin: true }, (error: any) => {
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
});

// Listen on a specific port
const PORT = 3000; // Change to your desired port
server.listen(PORT, () => {
    console.log(`Proxy server is running on http://localhost:${PORT}`);
});