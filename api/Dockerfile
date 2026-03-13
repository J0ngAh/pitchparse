FROM python:3.12-slim AS builder
WORKDIR /app
COPY api/requirements.txt .
RUN pip install --no-cache-dir --target=/deps -r requirements.txt

FROM python:3.12-slim
RUN useradd --create-home appuser
WORKDIR /app
COPY --from=builder /deps /usr/local/lib/python3.12/site-packages
COPY api/ ./api/
USER appuser
EXPOSE 8000
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/api/health')" || exit 1
CMD ["uvicorn", "api.main:app", "--host", "0.0.0.0", "--port", "8000"]
