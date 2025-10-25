#!/bin/bash
# Render build script

echo "🔧 Installing dependencies..."
npm ci

echo "📦 Generating Prisma client..."
npx prisma generate

echo "🔄 Converting TypeScript API files to JavaScript..."
# Convert .ts files to .js for runtime
for file in api/*.ts; do
  if [ -f "$file" ]; then
    cp "$file" "${file%.ts}.js"
  fi
done

echo "🏗️ Building frontend..."
npm run build

echo "✅ Build completed successfully!"