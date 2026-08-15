FROM python:3.11-slim

WORKDIR /app

RUN apt-get update -o Acquire::ForceIPv4=true && DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends -o Acquire::ForceIPv4=true \
    libpq-dev \
    gcc \
    postgresql-client \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

RUN chmod +x entrypoint.sh

EXPOSE 5000

ENTRYPOINT ["sh", "./entrypoint.sh"]
