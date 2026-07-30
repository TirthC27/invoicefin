FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1

WORKDIR /app

RUN apt-get update \
    && apt-get install -y --no-install-recommends build-essential libpq-dev \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --upgrade pip \
    && pip install -r requirements.txt

COPY . .

RUN chmod +x /app/docker-entrypoint.sh \
    && DJANGO_SECRET_KEY=build-time-collectstatic-key \
       DEBUG=False \
       ALLOWED_HOSTS=localhost \
       DATABASE_URL=sqlite:////tmp/collectstatic.sqlite3 \
       CORS_ALLOWED_ORIGINS=http://localhost:5173 \
       python manage.py collectstatic --noinput

EXPOSE 8000

CMD ["sh", "-c", "python manage.py migrate --noinput && exec gunicorn invoicefin_backend.wsgi:application --bind 0.0.0.0:${PORT:-8000}"]
