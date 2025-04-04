#!/bin/bash
set -e
sleep 5
# Wait for MongoDB to be available (without extra options)
# (If you need a timeout, you can extend the script, but here we keep it simple.)
/usr/local/bin/wait-for-it mongodb 27017

# Start the uvicorn server in the background
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload --ws websockets &

# Run the sync script
python3 app/scripts/sync_llms.py

# Wait for background processes (if any)
wait

