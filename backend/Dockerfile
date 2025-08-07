FROM python:3.11-slim
WORKDIR /app

# Install uvicorn, FastAPI, etc.
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy your code
COPY . .

ENV PYTHONUNBUFFERED=1
EXPOSE 8000

# Run Uvicorn
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
