import express from 'express'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import cors from 'cors'
import path from 'path'
import fs from 'fs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const app = express()
const PORT = process.env.PORT || 3000

console.log('🚀 Starting server...')
console.log('📁 Current directory:', __dirname)
console.log('🔧 Node version:', process.version)
console.log('🌍 Environment:', process.env.NODE_ENV)
console.log('📍 Port:', PORT)

// Check if required directories exist
const distPath = join(__dirname, 'dist')
const apiPath = join(__dirname, 'api')

console.log('📦 Checking directories...')
console.log('   dist exists:', fs.existsSync(distPath))
console.log('   api exists:', fs.existsSync(apiPath))

if (fs.existsSync(apiPath)) {
  console.log('📝 API files:', fs.readdirSync(apiPath))
}

// Middleware
app.use(cors())
app.use(express.json({ limit: '10mb' }))

// Serve static files from dist
app.use(express.static(join(__dirname, 'dist')))

// Simple API routes without dynamic imports for now
app.get('/api/health', (req, res) => {
  console.log('📊 Health check requested')
  res.status(200).json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development'
  })
})

app.get('/api/debug', (req, res) => {
  console.log('🐛 Debug endpoint requested')
  res.status(200).json({
    status: 'debug-ok',
    env: {
      DATABASE_URL: process.env.DATABASE_URL ? 'present' : 'missing',
      DATASCOPE_API_KEY: process.env.DATASCOPE_API_KEY ? 'present' : 'missing',
      DATASCOPE_BASE_URL: process.env.DATASCOPE_BASE_URL || 'missing'
    },
    method: req.method,
    timestamp: new Date().toISOString()
  })
})

// Temporary simple batch endpoint
app.post('/api/simple-batch', (req, res) => {
  console.log('📝 Simple batch requested')
  res.status(200).json({
    success: true,
    message: 'Server is running, API handlers will be loaded soon',
    timestamp: new Date().toISOString()
  })
})

// Other endpoints
app.get('/api/*', (req, res) => {
  console.log('🔍 API endpoint requested:', req.path)
  res.status(404).json({ 
    error: 'API endpoint not found', 
    path: req.path,
    message: 'Server is running but this endpoint is not implemented yet'
  })
})

// Health check for deployment
app.get('/_health', (req, res) => {
  res.status(200).json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0'
  })
})

// Serve React app for all other routes (non-API routes)
app.get(/^(?!\/api).*/, (req, res) => {
  res.sendFile(join(__dirname, 'dist', 'index.html'))
})

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Unhandled error:', error)
  res.status(500).json({ error: 'Internal server error' })
})

const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on http://0.0.0.0:${PORT}`)
  console.log(`📊 Health check: http://0.0.0.0:${PORT}/_health`)
  console.log(`🔗 API endpoint: http://0.0.0.0:${PORT}/api/simple-batch`)
  console.log(`✅ Server started successfully!`)
})

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('📴 SIGTERM received, shutting down gracefully')
  server.close(() => {
    console.log('✅ Server closed')
    process.exit(0)
  })
})

process.on('SIGINT', () => {
  console.log('📴 SIGINT received, shutting down gracefully') 
  server.close(() => {
    console.log('✅ Server closed')
    process.exit(0)
  })
})

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error)
  process.exit(1)
})

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason)
  process.exit(1)
})