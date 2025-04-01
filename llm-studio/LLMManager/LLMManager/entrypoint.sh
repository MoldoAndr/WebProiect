#!/bin/bash
set -e # Exit immediately if a command exits with a non-zero status.

echo "----> Running LLM Manager entrypoint script..."

# Run the initialization script
echo "----> Executing model initialization..."
./initialize_models.sh
echo "----> Model initialization finished."

# Execute the command passed as arguments to the entrypoint (which will be the Dockerfile's CMD by default)
echo "----> Starting main process (Gunicorn)..."
exec "$@"
