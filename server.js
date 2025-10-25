import express from 'express'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import cors from 'cors'
import path from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const app = express()
const PORT = process.env.PORT || 3000

// Middleware
app.use(cors())
app.use(express.json({ limit: '10mb' }))

// Serve static files from dist
app.use(express.static(join(__dirname, 'dist')))

// Import API handlers dynamically
const createApiHandler = (handlerPath) => async (req, res) => {
  try {
    const { default: handler } = await import(handlerPath)
    await handler(req, res)
  } catch (error) {
    console.error(`Error in ${handlerPath}:`, error)
    res.status(500).json({ error: 'Internal server error' })
  }
}

// API Routes
app.get('/api/health', createApiHandler('./api/health.js'))
app.get('/api/debug', createApiHandler('./api/debug.js'))
app.post('/api/simple-batch', createApiHandler('./api/simple-batch.js'))
app.post('/api/simple-batch-normalized', createApiHandler('./api/simple-batch-normalized.js'))
app.get('/api/equipment', createApiHandler('./api/equipment/index.js'))
app.post('/api/equipment/batch', createApiHandler('./api/equipment/batch.js'))
app.get('/api/test-datascope', createApiHandler('./api/test-datascope.js'))

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

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on http://0.0.0.0:${PORT}`)
  console.log(`📊 Health check: http://0.0.0.0:${PORT}/_health`)
  console.log(`🔗 API endpoint: http://0.0.0.0:${PORT}/api/simple-batch`)
})