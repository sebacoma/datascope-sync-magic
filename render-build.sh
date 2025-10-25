#!/bin/bash
# Render build script

echo "🔧 Installing dependencies..."
npm ci

echo "📦 Generating Prisma client..."
npx prisma generate

echo "🏗️ Building frontend..."
npm run build

echo "✅ Build completed successfully!"