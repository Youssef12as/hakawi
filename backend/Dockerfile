FROM python:3.10-slim

WORKDIR /app

COPY requirements/ requirements/
RUN pip install --no-cache-dir -r requirements/base.txt

COPY . .

CMD sh -c "uvicorn src.main:app --host 0.0.0.0 --port ${PORT:-7860}"
