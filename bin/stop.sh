#!/bin/bash

cd /home/reason-framework/packages/cds-service

PID=$(netstat -tuln | grep ":9001 " | awk '{print $7}' | cut -d'/' -f1)
# PID=$( pgrep -f "node .*server.js")
echo "$PID"

if [ -n "$PID" ]; then
  echo "Stopping server"
  kill "$PID"
else
  echo "Server is not running"
fi