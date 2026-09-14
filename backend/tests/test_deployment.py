from fastapi.testclient import TestClient
from src.main import app

client = TestClient(app)

def test_health_check_for_deployment():
    """Ensure the API starts up and the health endpoint is reachable in CI."""
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert "rag_ready" in data
