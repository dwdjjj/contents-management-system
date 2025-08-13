FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

# (MySQL 드라이버 쓸 때만 주석 해제)
# RUN apt-get update && apt-get install -y --no-install-recommends \
#     default-libmysqlclient-dev build-essential \
#  && rm -rf /var/lib/apt/lists/*

WORKDIR /app/backend

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 프로젝트 복사 (manage.py가 /app/backend 에 있어야 함)
COPY . .

EXPOSE 8000 8001
