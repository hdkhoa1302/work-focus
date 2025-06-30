#!/bin/bash

echo "🔍 Debug App Restart Issues"
echo "============================"

# Kill any existing instances
echo "🧹 Cleaning up existing instances..."
npm run force-cleanup
sleep 2

# Build app
echo "🔨 Building app..."
npm run build

# Monitor and start app with detailed logging
echo "🚀 Starting app with debug monitoring..."
echo "Press Ctrl+C to stop"

# Function to monitor processes
monitor_processes() {
    while true; do
        PIDS=$(pgrep -f "Work Focus" 2>/dev/null || true)
        if [ ! -z "$PIDS" ]; then
            echo "$(date): Work Focus PIDs: $PIDS"
            for PID in $PIDS; do
                ps -p $PID -o pid,ppid,command 2>/dev/null || echo "Process $PID exited"
            done
        else
            echo "$(date): No Work Focus processes running"
        fi
        sleep 2
    done
}

# Start monitoring in background
monitor_processes &
MONITOR_PID=$!

# Start the app with debug logging
NODE_ENV=production electron . --enable-logging 2>&1 | while read line; do
    echo "$(date): $line"
done

# Cleanup monitor on exit
kill $MONITOR_PID 2>/dev/null || true

echo ""
echo "🔍 Debug complete. Check logs above for restart patterns."
echo "Common restart causes:"
echo "1. electron-reload still active"
echo "2. Database connection errors"
echo "3. Uncaught exceptions in main process"
echo "4. Timer/interval issues"
echo "5. IPC handler conflicts" 