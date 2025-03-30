FROM python:3.11-slim

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PYTHONPATH=/app \
    PIP_NO_CACHE_DIR=off \
    PIP_DISABLE_PIP_VERSION_CHECK=on

RUN apt-get update \
    && apt-get install -y --no-install-recommends \
    build-essential \
    curl \
    netcat-traditional \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt /app/

RUN pip install --upgrade pip \
    && pip install -r requirements.txt \
    && pip install "uvicorn[standard]" websockets wsproto

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

COPY . /app/

RUN mkdir -p /app/data /app/logs

EXPOSE 8000

CMD ["python3", "app/scripts/sync_llms.py"]

CMD ["wait-for-it", "mongodb", "27017", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload", "--ws", "websockets"]
