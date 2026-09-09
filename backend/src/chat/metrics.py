"""
Hikawi Pipeline Metrics — Observability Module
================================================
Central module for tracking RAG pipeline performance metrics
using OpenTelemetry spans. All metrics are automatically visible
in the Phoenix Dashboard.

Tracked metrics per request:
- pipeline.total_latency_ms
- pipeline.rag_search_ms
- pipeline.generation_ms
- pipeline.confidence_score (top cosine similarity)
- pipeline.chunks_retrieved
- pipeline.response_mode
- pipeline.route_decision (future: Router Agent)
- pipeline.guard_decision (future: Guard Agent)
- pipeline.user_query
- pipeline.monument
- pipeline.model_id
"""

import time
import logging
from contextlib import contextmanager
from dataclasses import dataclass, field

try:
    from opentelemetry import trace
    tracer = trace.get_tracer("hikawi.pipeline")
except ImportError:
    trace = None
    tracer = None


@dataclass
class PipelineMetrics:
    """Accumulates timing and quality metrics for a single request."""

    # Timings (in seconds, converted to ms when logged)
    total_start: float = 0.0
    rag_search_ms: float = 0.0
    generation_ms: float = 0.0
    guard_ms: float = 0.0

    # Quality metrics
    confidence_score: float = 0.0       # Top cosine similarity score
    chunks_retrieved: int = 0

    # Pipeline decisions
    route_decision: str = "HISTORY"     # GREETING / HISTORY / OFF_TOPIC
    guard_decision: str = "SKIPPED"     # SAFE / HALLUCINATION / SKIPPED
    response_mode: str = "direct"       # direct / hikaya / presentation

    # Context
    user_query: str = ""
    monument: str = ""
    builder: str = ""
    persona_key: str = ""
    model_id: str = ""
    language_mode: str = "modern"

    def start(self):
        """Mark the start of the pipeline."""
        self.total_start = time.perf_counter()

    @property
    def total_latency_ms(self) -> float:
        """Total time from start to now, in milliseconds."""
        if self.total_start == 0:
            return 0.0
        return (time.perf_counter() - self.total_start) * 1000


@contextmanager
def timed_section(metrics: PipelineMetrics, section: str):
    """
    Context manager to time a section of the pipeline.

    Usage:
        with timed_section(metrics, "rag_search"):
            results = search(query)
        # metrics.rag_search_ms is now set
    """
    start = time.perf_counter()
    yield
    elapsed_ms = (time.perf_counter() - start) * 1000
    setattr(metrics, f"{section}_ms", elapsed_ms)


def log_pipeline_metrics(metrics: PipelineMetrics) -> None:
    """
    Log all accumulated metrics to the current OpenTelemetry span (if enabled)
    and to Python logging. These metrics will appear automatically
    in the Phoenix Dashboard under the current trace's Attributes.
    """
    if trace is not None and tracer is not None:
        span = trace.get_current_span()
        if span is None or not span.is_recording():
            # Create a new span if none exists
            with tracer.start_as_current_span("pipeline.metrics") as new_span:
                _write_to_span(new_span, metrics)
        else:
            _write_to_span(span, metrics)
    else:
        # Fallback console log when OpenTelemetry is disabled
        logger.info(
            "📊 Pipeline Metrics | total=%.0fms | rag=%.0fms | gen=%.0fms | "
            "confidence=%.3f | chunks=%d | route=%s | guard=%s | mode=%s",
            metrics.total_latency_ms,
            metrics.rag_search_ms,
            metrics.generation_ms,
            metrics.confidence_score,
            metrics.chunks_retrieved,
            metrics.route_decision,
            metrics.guard_decision,
            metrics.response_mode,
        )


def _write_to_span(span, metrics: PipelineMetrics) -> None:
    """Write all metrics to a span."""
    # Timings
    span.set_attribute("pipeline.total_latency_ms", round(metrics.total_latency_ms, 1))
    span.set_attribute("pipeline.rag_search_ms", round(metrics.rag_search_ms, 1))
    span.set_attribute("pipeline.generation_ms", round(metrics.generation_ms, 1))
    span.set_attribute("pipeline.guard_ms", round(metrics.guard_ms, 1))

    # Quality
    span.set_attribute("pipeline.confidence_score", round(metrics.confidence_score, 4))
    span.set_attribute("pipeline.chunks_retrieved", metrics.chunks_retrieved)

    # Decisions
    span.set_attribute("pipeline.route_decision", metrics.route_decision)
    span.set_attribute("pipeline.guard_decision", metrics.guard_decision)
    span.set_attribute("pipeline.response_mode", metrics.response_mode)

    # Context
    span.set_attribute("pipeline.user_query", metrics.user_query)
    span.set_attribute("pipeline.monument", metrics.monument)
    span.set_attribute("pipeline.builder", metrics.builder)
    span.set_attribute("pipeline.persona_key", metrics.persona_key)
    span.set_attribute("pipeline.language_mode", metrics.language_mode)

    # Log summary to console too
    logger.info(
        "📊 Pipeline Metrics | total=%.0fms | rag=%.0fms | gen=%.0fms | "
        "confidence=%.3f | chunks=%d | route=%s | guard=%s | mode=%s",
        metrics.total_latency_ms,
        metrics.rag_search_ms,
        metrics.generation_ms,
        metrics.confidence_score,
        metrics.chunks_retrieved,
        metrics.route_decision,
        metrics.guard_decision,
        metrics.response_mode,
    )
