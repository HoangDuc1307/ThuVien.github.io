FROM python:3.11-slim

# Cài đặt các thư viện hệ thống cần thiết cho psycopg2
RUN apt-get update && apt-get install -y \
    libpq-dev \
    gcc \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy tệp requirements.txt từ thư mục cha
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy mã nguồn của book-service
COPY book-service/ .

EXPOSE 8001

CMD ["python", "manage.py", "runserver", "0.0.0.0:8001"]
