FROM python:3.11-slim

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PYTHONPATH=/app \
    PIP_NO_CACHE_DIR=off \
    PIP_DISABLE_PIP_VERSION_CHECK=on

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    curl \
    netcat-traditional \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt /app/

RUN pip install --upgrade pip \
    && pip install -r requirements.txt \
    && pip install "uvicorn[standard]" websockets wsproto

# Create an improved wait-for-it script that checks if there are extra arguments before calling exec.
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
if [ "$#" -gt 0 ]; then\n\
  exec "$@"\n\
fi' > /usr/local/bin/wait-for-it \
    && chmod +x /usr/local/bin/wait-for-it

COPY . /app/

RUN mkdir -p /app/data /app/logs

# Copy the entrypoint script and make it executable
COPY entrypoint.sh /app/entrypoint.sh
RUN chmod +x /app/entrypoint.sh

EXPOSE 8000

ENTRYPOINT ["/app/entrypoint.sh"]

