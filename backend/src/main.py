import logging
from fastapi import FastAPI

from src.cors import setup_cors
from src.chat.rag_service import is_ready as rag_is_ready
from src.chat.router import router as chat_router
from src.governorates.router import router as governorates_router
from src.characters.router import router as characters_router
from src.family.router import router as family_router

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)

# FastAPI Application Factory
app = FastAPI(
    title="Hikawi API — حكاوي",
    description="Interactive Egyptian Oral Heritage Chatbot API",
    version="1.1.0",
)

# Setup CORS
setup_cors(app)

# Register domain routers
app.include_router(chat_router)
app.include_router(governorates_router)
app.include_router(characters_router)
app.include_router(family_router)


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
