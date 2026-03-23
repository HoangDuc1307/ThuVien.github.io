const express = require('express');
const { createProxyMiddleware, fixRequestBody } = require('http-proxy-middleware');
const cors = require('cors');

const app = express();
const PORT = 8002;

// Configuration from environment variables
const USER_SERVICE_URL = process.env.USER_SERVICE_URL || 'http://localhost:8000';
const BOOK_SERVICE_URL = process.env.BOOK_SERVICE_URL || 'http://localhost:8001';
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || 'http://localhost:4200,http://127.0.0.1:4200').split(',');

// Middleware
app.use(express.json());

// CORS Configuration
app.use(cors({
    origin: ALLOWED_ORIGINS,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
    exposedHeaders: ['Authorization']
}));

// Logging Middleware
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    console.log('Headers:', req.headers.authorization ? 'Token present' : 'No token');
    next();
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({
        status: 'OK',
        service: 'API Gateway',
        port: PORT,
        user_service: USER_SERVICE_URL,
        book_service: BOOK_SERVICE_URL,
        timestamp: new Date().toISOString()
    });
});

// Proxy cho BOOK SERVICE
app.use('/api/books', createProxyMiddleware({
    target: BOOK_SERVICE_URL,
    changeOrigin: true,
    pathRewrite: {
        '^/api/books/books': '/books',
        '^/api/books': '',
    },
    onProxyReq: (proxyReq, req, res) => {
        console.log(`📚 [BOOK SERVICE] Proxying to: ${proxyReq.path}`);

        // Forward Authorization header
        if (req.headers.authorization) {
            proxyReq.setHeader('Authorization', req.headers.authorization);
        }

        // Fix request body for POST/PUT/PATCH
        fixRequestBody(proxyReq, req, res);
    },
    onProxyRes: (proxyRes, req, res) => {
        console.log(`📚 [BOOK SERVICE] Response: ${proxyRes.statusCode}`);
    },
    onError: (err, req, res) => {
        console.error('❌ [BOOK SERVICE] Proxy Error:', err.message);
        res.status(500).json({
            error: 'Book Service unavailable',
            message: err.message
        });
    }
}));

// Proxy cho USER SERVICE
app.use('/api/users', createProxyMiddleware({
    target: USER_SERVICE_URL,
    changeOrigin: true,
    pathRewrite: {
        '^/api/users': ''
    },
    onProxyReq: (proxyReq, req, res) => {
        console.log(`👤 [USER SERVICE] Proxying to: ${proxyReq.path}`);

        // Forward Authorization header
        if (req.headers.authorization) {
            proxyReq.setHeader('Authorization', req.headers.authorization);
        }

        // Fix request body
        fixRequestBody(proxyReq, req, res);
    },
    onProxyRes: (proxyRes, req, res) => {
        console.log(`👤 [USER SERVICE] Response: ${proxyRes.statusCode}`);
    },
    onError: (err, req, res) => {
        console.error('❌ [USER SERVICE] Proxy Error:', err.message);
        res.status(500).json({
            error: 'User Service unavailable',
            message: err.message
        });
    }
}));

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        error: 'Not Found',
        message: `Route ${req.url} not found`,
    });
});

// Start server
app.listen(PORT, () => {
    console.log('╔════════════════════════════════════════╗');
    console.log('║    🚀 API Gateway Running             ║');
    console.log('╠════════════════════════════════════════╣');
    console.log(`║    Port: ${PORT}                           ║`);
    console.log(`║    User Service:  ${USER_SERVICE_URL} ║`);
    console.log(`║    Book Service:  ${BOOK_SERVICE_URL} ║`);
    console.log('╚════════════════════════════════════════╝');
});

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down API Gateway...');
    process.exit(0);
});