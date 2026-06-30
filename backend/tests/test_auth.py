def test_register(client):
    resp = client.post(
        "/api/auth/register",
        json={"username": "testuser", "password": "testpass123"},
    )
    body = resp.json()
    assert resp.status_code == 200
    assert body["success"] is True
    assert body["data"]["username"] == "testuser"
    assert "id" in body["data"]
    assert "request_id" in body["meta"]
    assert "timestamp" in body["meta"]


def test_register_duplicate(client):
    client.post(
        "/api/auth/register",
        json={"username": "dupuser", "password": "testpass123"},
    )
    resp = client.post(
        "/api/auth/register",
        json={"username": "dupuser", "password": "testpass123"},
    )
    body = resp.json()
    assert resp.status_code == 400
    assert body["success"] is False
    assert "already taken" in body["data"]["detail"]


def test_login_success(client):
    client.post(
        "/api/auth/register",
        json={"username": "loginuser", "password": "testpass123"},
    )
    resp = client.post(
        "/api/auth/login",
        json={"username": "loginuser", "password": "testpass123"},
    )
    body = resp.json()
    assert resp.status_code == 200
    assert body["success"] is True
    assert "access_token" in body["data"]
    assert body["data"]["token_type"] == "bearer"


def test_login_wrong_password(client):
    client.post(
        "/api/auth/register",
        json={"username": "wrongpassuser", "password": "testpass123"},
    )
    resp = client.post(
        "/api/auth/login",
        json={"username": "wrongpassuser", "password": "wrongpass"},
    )
    body = resp.json()
    assert resp.status_code == 401
    assert body["success"] is False
    assert "Invalid" in body["data"]["detail"]


def test_login_nonexistent_user(client):
    resp = client.post(
        "/api/auth/login",
        json={"username": "nonexistent", "password": "testpass123"},
    )
    body = resp.json()
    assert resp.status_code == 401
    assert body["success"] is False


def test_protected_endpoint_with_token(client):
    client.post(
        "/api/auth/register",
        json={"username": "authuser", "password": "testpass123"},
    )
    login_resp = client.post(
        "/api/auth/login",
        json={"username": "authuser", "password": "testpass123"},
    )
    token = login_resp.json()["data"]["access_token"]

    resp = client.get(
        "/api/students",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["success"] is True


def test_protected_endpoint_without_token(client):
    resp = client.get("/api/students")
    assert resp.status_code == 401
    body = resp.json()
    assert body["success"] is False
