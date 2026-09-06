FROM python:3.10-slim

WORKDIR /app

COPY requirements/ requirements/
RUN pip install --no-cache-dir -r requirements/base.txt

COPY . .

CMD ["uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "7860"]
