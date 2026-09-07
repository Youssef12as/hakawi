import json
import logging
import asyncio
import requests
import websockets
from fastapi import WebSocket, WebSocketDisconnect

from src.config import settings

logger = logging.getLogger(__name__)

DEEPGRAM_REST_URL = "https://api.deepgram.com/v1/listen?model=nova-3&language=ar&smart_format=true"
DEEPGRAM_WS_URL = (
    "wss://api.deepgram.com/v1/listen?"
    "model=nova-3&language=ar&smart_format=true&interim_results=true&endpointing=10"
)

CONTENT_TYPE_MAP = {
    ".webm": "audio/webm",
    ".ogg": "audio/ogg",
    ".wav": "audio/wav",
    ".mp3": "audio/mpeg",
    ".m4a": "audio/mp4",
}


def _get_content_type(filename: str) -> str:
    filename = filename.lower()
    for ext, content_type in CONTENT_TYPE_MAP.items():
        if filename.endswith(ext):
            return content_type
    return "audio/webm"


def transcribe_audio_deepgram(audio_bytes: bytes, filename: str = "audio.webm") -> str:
    """
    Transcribe Arabic audio using Deepgram Nova-3 pre-recorded REST API.
    Fast synchronous single-call transcription (~300-600ms).
    """
    if not settings.DEEPGRAM_API_KEY:
        raise ValueError("DEEPGRAM_API_KEY is not configured")

    content_type = _get_content_type(filename)
    headers = {
        "Authorization": f"Token {settings.DEEPGRAM_API_KEY}",
        "Content-Type": content_type,
    }

    response = requests.post(
        DEEPGRAM_REST_URL,
        headers=headers,
        data=audio_bytes,
        timeout=15,
    )
    response.raise_for_status()

    data = response.json()
    try:
        transcript = (
            data.get("results", {})
            .get("channels", [{}])[0]
            .get("alternatives", [{}])[0]
            .get("transcript", "")
        )
        return transcript.strip()
    except (IndexError, KeyError) as e:
        logger.error(f"Error parsing Deepgram response: {e}")
        return ""


async def proxy_deepgram_ws(client_ws: WebSocket):
    """
    Bi-directional streaming proxy between frontend browser WebSocket
    and Deepgram Nova-3 WebSocket. Keeps API key secured on the server.
    """
    if not settings.DEEPGRAM_API_KEY:
        await client_ws.close(code=1008, reason="DEEPGRAM_API_KEY not set")
        return

    headers = {
        "Authorization": f"Token {settings.DEEPGRAM_API_KEY}",
    }

    try:
        async with websockets.connect(DEEPGRAM_WS_URL, additional_headers=headers) as dg_ws:
            logger.info("Connected to Deepgram streaming WebSocket")

            async def client_to_deepgram():
                try:
                    while True:
                        msg = await client_ws.receive()
                        if "bytes" in msg and msg["bytes"]:
                            await dg_ws.send(msg["bytes"])
                        elif "text" in msg and msg["text"]:
                            # Support client sending control signals like CloseStream
                            await dg_ws.send(msg["text"])
                except (WebSocketDisconnect, asyncio.CancelledError):
                    try:
                        await dg_ws.send(json.dumps({"type": "CloseStream"}))
                    except Exception:
                        pass
                except Exception as e:
                    logger.debug(f"client_to_deepgram stream ended: {e}")

            async def deepgram_to_client():
                try:
                    async for dg_msg in dg_ws:
                        # dg_msg is JSON string with interim or final results
                        await client_ws.send_text(dg_msg)
                except (WebSocketDisconnect, asyncio.CancelledError):
                    pass
                except Exception as e:
                    logger.debug(f"deepgram_to_client stream ended: {e}")

            # Run both streaming directions concurrently
            c2d_task = asyncio.create_task(client_to_deepgram())
            d2c_task = asyncio.create_task(deepgram_to_client())

            done, pending = await asyncio.wait(
                [c2d_task, d2c_task],
                return_when=asyncio.FIRST_COMPLETED,
            )
            for task in pending:
                task.cancel()

    except Exception as e:
        logger.error(f"Deepgram WebSocket proxy error: {e}")
        try:
            await client_ws.close(code=1011, reason=str(e))
        except Exception:
            pass
