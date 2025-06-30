#!/bin/bash

echo "🔧 Debug DMG Build Process"
echo "=========================="

# Cleanup previous builds
echo "🧹 Cleaning previous builds..."
rm -rf dist/
rm -rf node_modules/.cache/

# Build with debug info
echo "🚀 Building with debug info..."
npm run build

# Build DMG với debug
echo "📦 Building DMG với debug output..."
DEBUG=electron-builder npm run dist:mac

echo "✅ Build completed!"
echo ""
echo "📋 Troubleshooting steps:"
echo "1. Mở Console.app và tìm logs của 'Work Focus'"
echo "2. Chạy: codesign -dv --verbose=4 dist/mac/Work\\ Focus.app"
echo "3. Kiểm tra crash reports: ~/Library/Logs/DiagnosticReports/"
echo "4. Thử: spctl -a -vvv dist/mac/Work\\ Focus.app"
echo ""
echo "🔍 Để xem logs chi tiết:"
echo "log stream --predicate 'process == \"Work Focus\"' --level debug" 