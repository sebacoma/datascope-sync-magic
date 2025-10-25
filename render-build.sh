#!/bin/bash
# Render build script

set -e  # Exit on any error

echo "🔧 Installing dependencies..."
npm ci --only=production

echo "📦 Generating Prisma client..."
npx prisma generate

echo "🏗️ Building frontend with development dependencies..."
npm install
npm run build

echo "🧹 Cleaning up dev dependencies..."
npm prune --production

echo "✅ Build completed successfully!"