FROM python:3.11-slim

WORKDIR /app

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PYTHONPATH=/app \
    PIP_NO_CACHE_DIR=off \
    PIP_DISABLE_PIP_VERSION_CHECK=on

# Install system dependencies
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
    build-essential \
    curl \
    netcat-traditional \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first for better caching
COPY requirements.txt /app/

# Install Python dependencies specifically including websockets
RUN pip install --upgrade pip \
    && pip install -r requirements.txt \
    && pip install "uvicorn[standard]" websockets wsproto

# Create wait-for-it script to handle service dependencies
RUN echo '#!/bin/bash\n\
set -e\n\
host="$1"\n\
shift\n\
port="$1"\n\
shift\n\
echo "Waiting for $host:$port..."\n\
until nc -z "$host" "$port"; do\n\
  >&2 echo "Waiting for $host:$port..."\n\
  sleep 1\n\
done\n\
>&2 echo "$host:$port is available"\n\
exec "$@"' > /usr/local/bin/wait-for-it \
    && chmod +x /usr/local/bin/wait-for-it

# Copy application code
COPY . /app/

# Create necessary directories
RUN mkdir -p /app/data /app/logs

# Make port 8000 available to the world outside this container
EXPOSE 8000

# Run the application with Uvicorn with standard extras and websockets
CMD ["wait-for-it", "mongodb", "27017", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload", "--ws", "websockets"]
