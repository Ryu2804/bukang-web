def test_health(client):
    resp = client.get("/api/health")
    body = resp.json()
    assert resp.status_code == 200
    assert body["success"] is True
    assert body["data"] == {"status": "ok"}
    assert "request_id" in body["meta"]
    assert "timestamp" in body["meta"]
