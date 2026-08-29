import io


def _upload_csv(client, headers, content=b"a,b\n1,x\n2,y\n3,z\n", filename="data.csv"):
    return client.post(
        "/api/v1/datasets",
        headers=headers,
        files={"file": (filename, io.BytesIO(content), "text/csv")},
    )


def test_upload_and_validate_dataset(client, auth_headers):
    resp = _upload_csv(client, auth_headers)
    assert resp.status_code == 201
    body = resp.json()
    assert body["status"] == "valid"
    assert body["row_count"] == 3
    assert body["column_count"] == 2


def test_upload_rejects_unsupported_extension(client, auth_headers):
    resp = _upload_csv(client, auth_headers, content=b"hello", filename="data.txt")
    assert resp.status_code == 400


def test_upload_empty_file_marks_invalid(client, auth_headers):
    resp = _upload_csv(client, auth_headers, content=b"", filename="empty.csv")
    assert resp.status_code == 201
    assert resp.json()["status"] == "invalid"


def test_list_datasets_paginated(client, auth_headers):
    for i in range(3):
        _upload_csv(client, auth_headers, filename=f"data_{i}.csv")
    resp = client.get("/api/v1/datasets?page=1&page_size=2", headers=auth_headers)
    assert resp.status_code == 200
    body = resp.json()
    assert body["total"] == 3
    assert len(body["items"]) == 2
    assert body["total_pages"] == 2


def test_dataset_not_visible_to_other_user(client, auth_headers):
    upload = _upload_csv(client, auth_headers)
    dataset_id = upload.json()["id"]

    client.post("/api/v1/auth/register", json={"email": "other@example.com", "password": "password123"})
    login = client.post("/api/v1/auth/login", json={"email": "other@example.com", "password": "password123"})
    other_headers = {"Authorization": f"Bearer {login.json()['access_token']}"}

    resp = client.get(f"/api/v1/datasets/{dataset_id}", headers=other_headers)
    assert resp.status_code == 404


def test_preview_dataset(client, auth_headers):
    upload = _upload_csv(client, auth_headers)
    dataset_id = upload.json()["id"]
    resp = client.get(f"/api/v1/datasets/{dataset_id}/preview", headers=auth_headers)
    assert resp.status_code == 200
    body = resp.json()
    assert body["total_rows"] == 3
    assert len(body["rows"]) == 3


def test_delete_dataset(client, auth_headers):
    upload = _upload_csv(client, auth_headers)
    dataset_id = upload.json()["id"]
    resp = client.delete(f"/api/v1/datasets/{dataset_id}", headers=auth_headers)
    assert resp.status_code == 204
    resp = client.get(f"/api/v1/datasets/{dataset_id}", headers=auth_headers)
    assert resp.status_code == 404


def test_unauthenticated_upload_rejected(client):
    resp = _upload_csv(client, headers={})
    assert resp.status_code == 401
