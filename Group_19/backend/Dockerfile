FROM node:22-bookworm-slim

WORKDIR /app

# ============================================================
# System dependencies
# ============================================================
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
        python3 \
        python3-venv \
        python3-pip \
        build-essential \
        libgomp1 \
        libgl1 \
        libglib2.0-0 && \
    rm -rf /var/lib/apt/lists/*

# ============================================================
# Python virtual environment
# ============================================================
RUN python3 -m venv /opt/venv

ENV PATH="/opt/venv/bin:$PATH"
ENV PYTHON_EXEC="python"
ENV PYTHONUNBUFFERED="1"
ENV PYTHONDONTWRITEBYTECODE="1"
ENV MPLBACKEND="Agg"

# ============================================================
# Python ML dependencies
# ============================================================
COPY backend/python-requirements.txt /tmp/python-requirements.txt

RUN pip install --upgrade pip && \
    pip install --no-cache-dir -r /tmp/python-requirements.txt

# spaCy model used by Module 2 symptom matching
RUN python -m spacy download en_core_web_sm

# ============================================================
# Node.js dependencies
# ============================================================
COPY backend/package*.json /app/backend/

WORKDIR /app/backend

RUN if [ -f package-lock.json ]; then \
        npm ci --omit=dev; \
    else \
        npm install --omit=dev; \
    fi

# ============================================================
# Copy the MediTwin application
# ============================================================
WORKDIR /app

COPY backend /app/backend
COPY Module_1 /app/Module_1
COPY Module_2 /app/Module_2
COPY Module_3 /app/Module_3

# Upload directory required by the Express server
RUN mkdir -p /app/backend/uploads/doctor-ids

WORKDIR /app/backend

EXPOSE 5000

CMD ["node", "server.js"]