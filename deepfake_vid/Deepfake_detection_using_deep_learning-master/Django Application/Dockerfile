FROM python:3.10-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    DJANGO_SETTINGS_MODULE=project_settings.settings

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    libgl1 \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir \
    django==4.2.11 \
    django-prometheus==2.3.1 \
    gunicorn==21.2.0 \
    Pillow \
    numpy \
    prometheus-client

COPY . /app

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD curl -f http://localhost:8000/health/ || exit 0

CMD ["gunicorn", "project_settings.wsgi:application", "--bind", "0.0.0.0:8000", "--workers", "2", "--timeout", "120"]