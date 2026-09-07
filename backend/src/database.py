"""
Database connection pool and helper utilities for Hakawi.
Connects directly to Supabase PostgreSQL using psycopg2 ThreadedConnectionPool.
"""

import logging
import os
from contextlib import contextmanager
from typing import Generator
import psycopg2
from psycopg2 import pool
from psycopg2.extras import RealDictCursor

from src.config import settings

logger = logging.getLogger(__name__)

DATABASE_URL = settings.DATABASE_URL or os.getenv("DATABASE_URL")

_connection_pool: pool.ThreadedConnectionPool | None = None


def get_pool() -> pool.ThreadedConnectionPool:
    """Initialize or return the existing connection pool."""
    global _connection_pool
    if _connection_pool is None or _connection_pool.closed:
        if not DATABASE_URL:
            raise RuntimeError("DATABASE_URL is not set in backend/.env or settings.")
        logger.info("Initializing Supabase database connection pool...")
        _connection_pool = pool.ThreadedConnectionPool(
            minconn=1,
            maxconn=10,
            dsn=DATABASE_URL,
        )
    return _connection_pool


@contextmanager
def get_db_connection() -> Generator[psycopg2.extensions.connection, None, None]:
    """Borrow a connection from the pool and return it when done."""
    conn_pool = get_pool()
    conn = conn_pool.getconn()
    try:
        yield conn
    finally:
        conn_pool.putconn(conn)


@contextmanager
def get_db_cursor(commit: bool = False) -> Generator[RealDictCursor, None, None]:
    """
    Context manager that yields a RealDictCursor (returns rows as dicts).
    Automatically rolls back on exception, commits on success if commit=True.
    """
    with get_db_connection() as conn:
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        try:
            yield cursor
            if commit:
                conn.commit()
        except Exception:
            conn.rollback()
            raise
        finally:
            cursor.close()


def check_db_health() -> bool:
    """Test connection to Supabase database."""
    try:
        with get_db_cursor() as cur:
            cur.execute("SELECT 1;")
            row = cur.fetchone()
            return row is not None
    except Exception as e:
        logger.error(f"Database health check failed: {e}")
        return False
