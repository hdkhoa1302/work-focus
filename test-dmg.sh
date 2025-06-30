#!/bin/bash

echo "🧪 Test DMG Comprehensive"
echo "========================="

# Build DMG
echo "📦 Building DMG..."
npm run dist:mac

DMG_PATH="dist/Work Focus-1.0.0.dmg"
APP_PATH="dist/mac/Work Focus.app"

if [ ! -f "$DMG_PATH" ]; then
    echo "❌ DMG không được tạo!"
    exit 1
fi

if [ ! -d "$APP_PATH" ]; then
    echo "❌ App bundle không tồn tại!"
    exit 1
fi

echo "✅ Build thành công!"
echo ""

# Test 1: Kiểm tra app structure
echo "🔍 Test 1: Kiểm tra app structure..."
ls -la "$APP_PATH/Contents/"
echo ""

# Test 2: Kiểm tra codesign
echo "🔍 Test 2: Kiểm tra code signature..."
codesign -dv --verbose=4 "$APP_PATH" 2>&1
echo ""

# Test 3: Kiểm tra gatekeeper
echo "🔍 Test 3: Kiểm tra gatekeeper..."
spctl -a -vvv "$APP_PATH" 2>&1 || echo "⚠️ Gatekeeper check failed (expected for unsigned app)"
echo ""

# Test 4: Kiểm tra main executable
echo "🔍 Test 4: Kiểm tra main executable..."
file "$APP_PATH/Contents/MacOS/Work Focus"
echo ""

# Test 5: Mount DMG và test
echo "🔍 Test 5: Mount DMG và test installation..."
mkdir -p /tmp/dmg-test
hdiutil attach "$DMG_PATH" -mountpoint /tmp/dmg-test -quiet

if [ -d "/tmp/dmg-test/Work Focus.app" ]; then
    echo "✅ DMG mount thành công"
    
    # Copy to temp location and test run
    cp -R "/tmp/dmg-test/Work Focus.app" /tmp/
    
    echo "🚀 Test khởi động app (5 giây)..."
    timeout 5s "/tmp/Work Focus.app/Contents/MacOS/Work Focus" --no-sandbox &
    APP_PID=$!
    
    sleep 2
    
    if kill -0 $APP_PID 2>/dev/null; then
        echo "✅ App khởi động thành công!"
        kill $APP_PID 2>/dev/null
        wait $APP_PID 2>/dev/null
    else
        echo "❌ App không khởi động được"
    fi
    
    # Cleanup
    rm -rf "/tmp/Work Focus.app"
else
    echo "❌ Không tìm thấy app trong DMG"
fi

hdiutil detach /tmp/dmg-test -quiet
rm -rf /tmp/dmg-test

echo ""
echo "🎯 Hướng dẫn test thủ công:"
echo "1. Double-click vào DMG: $DMG_PATH"
echo "2. Kéo Work Focus vào Applications"
echo "3. Mở từ Applications và kiểm tra:"
echo "   - App khởi động không crash"
echo "   - Không restart liên tục"
echo "   - UI hiển thị bình thường"
echo "   - Có thể đóng/mở bình thường"
echo ""
echo "🔍 Nếu vẫn có vấn đề, check:"
echo "- Console.app → Work Focus logs"
echo "- ~/Library/Logs/DiagnosticReports/"
echo "- Activity Monitor → Work Focus process" 