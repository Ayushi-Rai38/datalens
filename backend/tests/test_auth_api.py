def test_register_and_login(client):
    resp = client.post("/api/v1/auth/register", json={"email": "a@example.com", "password": "password123"})
    assert resp.status_code == 201

    resp = client.post("/api/v1/auth/login", json={"email": "a@example.com", "password": "password123"})
    assert resp.status_code == 200
    body = resp.json()
    assert "access_token" in body and "refresh_token" in body


def test_duplicate_registration_conflicts(client):
    client.post("/api/v1/auth/register", json={"email": "dup@example.com", "password": "password123"})
    resp = client.post("/api/v1/auth/register", json={"email": "dup@example.com", "password": "password123"})
    assert resp.status_code == 409


def test_login_wrong_password(client):
    client.post("/api/v1/auth/register", json={"email": "b@example.com", "password": "password123"})
    resp = client.post("/api/v1/auth/login", json={"email": "b@example.com", "password": "wrong"})
    assert resp.status_code == 401


def test_me_requires_token(client):
    resp = client.get("/api/v1/auth/me")
    assert resp.status_code == 401


def test_me_with_valid_token(client, auth_headers):
    resp = client.get("/api/v1/auth/me", headers=auth_headers)
    assert resp.status_code == 200
    assert resp.json()["email"] == "test@example.com"


def test_refresh_token_flow(client):
    client.post("/api/v1/auth/register", json={"email": "c@example.com", "password": "password123"})
    login_resp = client.post("/api/v1/auth/login", json={"email": "c@example.com", "password": "password123"})
    refresh_token = login_resp.json()["refresh_token"]

    resp = client.post("/api/v1/auth/refresh", json={"refresh_token": refresh_token})
    assert resp.status_code == 200
    assert "access_token" in resp.json()
