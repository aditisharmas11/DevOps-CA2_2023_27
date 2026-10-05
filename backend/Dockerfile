FROM python:3.11-slim

# Prevent writing .pyc files
ENV PYTHONDONTWRITEBYTECODE=1
# Prevent buffering stdout/stderr
ENV PYTHONUNBUFFERED=1

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Install python dependencies
COPY requirements.txt /app/
RUN pip install --no-cache-dir -r requirements.txt

# Copy project files
COPY . /app/

# Port exposure
EXPOSE 8000

# Script running command
CMD ["sh", "-c", "python wait_for_db.py db 5432 logistics_db postgres postgres && python manage.py migrate && python manage.py seed_data && python manage.py runserver 0.0.0.0:8000"]
