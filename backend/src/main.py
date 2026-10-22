import logging
import asyncio
from contextlib import asynccontextmanager, suppress
from fastapi import FastAPI

from src.cors import setup_cors
from src.chat.rag_service import is_ready as rag_is_ready
from src.chat.router import router as chat_router
from src.governorates.router import router as governorates_router
from src.characters.router import router as characters_router
from src.family.router import router as family_router
from src.auth_router import router as auth_router
from src.guest_auth import router as guest_router, cleanup_expired_guests
from src.config import settings

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)

# --- Phoenix & OpenTelemetry Observability Setup ---
_otel_available = False
try:
    from opentelemetry import trace
    from opentelemetry.sdk.trace import TracerProvider
    from opentelemetry.sdk.trace.export import BatchSpanProcessor
    from opentelemetry.exporter.otlp.proto.http.trace_exporter import OTLPSpanExporter
    from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor
    from opentelemetry.instrumentation.requests import RequestsInstrumentor

    # Configure OpenTelemetry to send traces to Phoenix in the background
    tracer_provider = TracerProvider()
    tracer_provider.add_span_processor(
        BatchSpanProcessor(OTLPSpanExporter(endpoint="http://localhost:6006/v1/traces"))
    )
    trace.set_tracer_provider(tracer_provider)

    # Auto-instrument all outgoing HTTP calls (like Gemini API)
    RequestsInstrumentor().instrument()
    _otel_available = True
    logger.info("OpenTelemetry instrumentation active (Phoenix endpoint: http://localhost:6006/v1/traces)")
except ImportError:
    logger.info("OpenTelemetry not installed; starting server without telemetry tracing.")
# ---------------------------------------------------

# FastAPI Application Factory
@asynccontextmanager
async def lifespan(app):
    async def clean_guests():
        while True:
            try:
                await asyncio.to_thread(cleanup_expired_guests)
            except Exception:
                logger.exception("Guest expiry cleanup failed")
            await asyncio.sleep(3600)

    task = asyncio.create_task(clean_guests()) if settings.GUEST_JWT_SECRET else None
    try:
        yield
    finally:
        if task:
            task.cancel()
            with suppress(asyncio.CancelledError):
                await task


app = FastAPI(
    lifespan=lifespan,
    title="Hikawi API — حكاوي",
    description="Interactive Egyptian Oral Heritage Chatbot API",
    version="1.1.0",
)

# 4. Auto-instrument incoming FastAPI requests (if OpenTelemetry is available)
if _otel_available:
    FastAPIInstrumentor.instrument_app(app)

# Setup CORS
setup_cors(app)

# Register domain routers
app.include_router(chat_router)
app.include_router(governorates_router)
app.include_router(characters_router)
app.include_router(family_router)
app.include_router(auth_router)
app.include_router(guest_router)


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {
        "status": "ok",
        "service": "hikawi",
        "rag_ready": rag_is_ready(),
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("src.main:app", host="0.0.0.0", port=8000, reload=True)
