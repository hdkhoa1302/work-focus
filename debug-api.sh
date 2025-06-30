#!/bin/bash

echo "🔍 Debug API Startup Issues"
echo "============================="

# Cleanup
echo "🧹 Cleanup existing processes..."
pkill -f "Work Focus" 2>/dev/null || true
pkill -f electron 2>/dev/null || true
sleep 1

# Check database connection first
echo ""
echo "📊 Testing MongoDB connection..."
if [ -f ".env" ]; then
    source .env
    if [ ! -z "$MONGO_URI" ]; then
        echo "✅ MONGO_URI found in .env"
        # Test basic connection with timeout
        mongosh "$MONGO_URI" --eval "db.adminCommand('ping')" --timeout 5000 2>/dev/null && echo "✅ MongoDB connection successful" || echo "❌ MongoDB connection failed"
    else
        echo "❌ MONGO_URI not found in .env"
    fi
else
    echo "❌ .env file not found"
fi

# Check ports
echo ""
echo "🔍 Checking ports 3000-3010..."
for port in {3000..3010}; do
    if lsof -i :$port >/dev/null 2>&1; then
        echo "Port $port: OCCUPIED"
        lsof -i :$port | head -2
    else
        echo "Port $port: FREE"
    fi
done

# Test API startup in isolation
echo ""
echo "🚀 Testing API startup..."
echo "Building app..."
npm run build >/dev/null 2>&1

echo "Starting app with API debug..."
NODE_ENV=production timeout 10s electron . --enable-logging 2>&1 | grep -E "(API|server|port|error|Error|listening|🌐|🚨|❌|✅)" | head -20

echo ""
echo "📋 Quick diagnosis:"
echo "1. Check if .env file exists and has MONGO_URI"
echo "2. Check if MongoDB is accessible"
echo "3. Check if ports 3000-3010 are available"
echo "4. Check build output in dist/ folder"
echo ""
echo "🔧 Manual testing:"
echo "1. Start app: npm start"
echo "2. Test API: curl http://localhost:3000/api/health"
echo "3. Check logs in Console.app" 