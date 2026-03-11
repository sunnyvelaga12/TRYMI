FROM python:3.10-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    libgl1-mesa-glx \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and install
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest of the application
COPY . .

# Set environment variables
ENV FLASK_APP=app.py
ENV PORT=7860

# Expose the port Hugging Face Spaces expects
EXPOSE 7860

# Run the application
CMD ["gunicorn", "app:app", "--bind", "0.0.0.0:7860", "--timeout", "300", "--workers", "1"]
