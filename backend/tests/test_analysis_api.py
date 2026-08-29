import io


def _upload_and_get_id(client, headers):
    content = b"a,b\n1,x\n2,y\n3,z\n4,x\n5,y\n"
    resp = client.post(
        "/api/v1/datasets", headers=headers,
        files={"file": ("data.csv", io.BytesIO(content), "text/csv")},
    )
    return resp.json()["id"]


def test_run_analysis_and_fetch_latest(client, auth_headers):
    dataset_id = _upload_and_get_id(client, auth_headers)

    run_resp = client.post(f"/api/v1/analysis/{dataset_id}/run", headers=auth_headers)
    assert run_resp.status_code == 201
    assert "quality_score" in run_resp.json()

    latest_resp = client.get(f"/api/v1/analysis/{dataset_id}/latest", headers=auth_headers)
    assert latest_resp.status_code == 200
    assert latest_resp.json()["dataset_id"] == dataset_id


def test_latest_report_uses_cache_on_second_call(client, auth_headers, monkeypatch):
    dataset_id = _upload_and_get_id(client, auth_headers)
    client.post(f"/api/v1/analysis/{dataset_id}/run", headers=auth_headers)

    from app.repositories.report_repository import ReportRepository
    original = ReportRepository.get_latest_for_dataset
    calls = {"count": 0}

    def counting(self, *a, **kw):
        calls["count"] += 1
        return original(self, *a, **kw)

    monkeypatch.setattr(ReportRepository, "get_latest_for_dataset", counting)

    client.get(f"/api/v1/analysis/{dataset_id}/latest", headers=auth_headers)
    client.get(f"/api/v1/analysis/{dataset_id}/latest", headers=auth_headers)
    # The DB should not be hit for the report on a cache-hit path.
    assert calls["count"] == 0


def test_no_report_before_analysis_run(client, auth_headers):
    dataset_id = _upload_and_get_id(client, auth_headers)
    resp = client.get(f"/api/v1/analysis/{dataset_id}/latest", headers=auth_headers)
    assert resp.status_code == 404


def test_report_history_pagination(client, auth_headers):
    dataset_id = _upload_and_get_id(client, auth_headers)
    for _ in range(3):
        client.post(f"/api/v1/analysis/{dataset_id}/run", headers=auth_headers)

    resp = client.get(f"/api/v1/analysis/{dataset_id}/history?page=1&page_size=2", headers=auth_headers)
    assert resp.status_code == 200
    body = resp.json()
    assert body["total"] == 3
    assert len(body["items"]) == 2


def test_compare_reports(client, auth_headers):
    dataset_id = _upload_and_get_id(client, auth_headers)
    r1 = client.post(f"/api/v1/analysis/{dataset_id}/run", headers=auth_headers).json()
    r2 = client.post(f"/api/v1/analysis/{dataset_id}/run", headers=auth_headers).json()

    resp = client.get(
        f"/api/v1/analysis/reports/compare?report_a={r1['id']}&report_b={r2['id']}", headers=auth_headers
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["score_delta"] == 0.0
    assert body["improved"] is True


def test_analysis_requires_valid_dataset(client, auth_headers):
    resp = client.post(
        "/api/v1/datasets", headers=auth_headers,
        files={"file": ("empty.csv", io.BytesIO(b""), "text/csv")},
    )
    dataset_id = resp.json()["id"]
    run_resp = client.post(f"/api/v1/analysis/{dataset_id}/run", headers=auth_headers)
    assert run_resp.status_code == 422
