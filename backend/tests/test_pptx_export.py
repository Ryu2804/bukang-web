import io
import zipfile
from xml.etree import ElementTree


def _auth_headers(client, username: str) -> dict[str, str]:
    client.post(
        "/api/auth/register",
        json={"username": username, "password": "testpass123"},
    )
    login = client.post(
        "/api/auth/login",
        json={"username": username, "password": "testpass123"},
    )
    token = login.json()["data"]["access_token"]
    return {"Authorization": f"Bearer {token}"}


def _submit_student(client, headers: dict[str, str], nrp: str, hometown: str) -> None:
    response = client.post(
        "/api/students/submissions",
        headers=headers,
        json={
            "nrp": nrp,
            "asal_daerah": hometown,
            "hobi": ["Membaca", "Musik"],
            "first_impression": "Ramah dan seru",
            "tempat_lahir": "Surabaya",
            "tanggal_lahir": "2007-01-02",
            "longitude": 112.7521,
            "latitude": -7.2575,
            "captured_at": "2026-09-03T10:00:00Z",
            "photo_url": "",
        },
    )
    assert response.status_code == 201


def _pptx_slide_texts(content: bytes) -> list[str]:
    namespace = {"a": "http://schemas.openxmlformats.org/drawingml/2006/main"}
    with zipfile.ZipFile(io.BytesIO(content)) as archive:
        slide_names = sorted(
            name
            for name in archive.namelist()
            if name.startswith("ppt/slides/slide") and name.endswith(".xml")
        )
        return [
            " ".join(
                node.text or ""
                for node in ElementTree.fromstring(archive.read(name)).findall(".//a:t", namespace)
            )
            for name in slide_names
        ]


def test_export_pptx_requires_authentication(client):
    response = client.get("/api/students/export/pptx")

    assert response.status_code == 401


def test_export_pptx_streams_bounded_chunks_and_closes_temporary_output(client, monkeypatch):
    headers = _auth_headers(client, "pptx-stream-owner")
    _submit_student(client, headers, "5025251001", "Kota Surabaya")
    read_sizes = []

    class TrackingFile(io.BytesIO):
        def read(self, size=-1):
            read_sizes.append(size)
            return super().read(size)

    output = TrackingFile(b"x" * ((1024 * 1024 * 2) + 10))
    monkeypatch.setattr(
        "app.presentation.routers.students.generate_pptx",
        lambda _students: output,
    )

    response = client.get("/api/students/export/pptx", headers=headers)

    assert response.status_code == 200
    assert len(response.content) == (1024 * 1024 * 2) + 10
    assert read_sizes
    assert max(read_sizes) <= 1024 * 1024
    assert output.closed


def test_export_pptx_uses_filtered_submissions_from_current_users_database(client, monkeypatch):
    monkeypatch.setattr(
        "app.infrastructure.export.pptx_generator.random.choice",
        lambda _: "keren",
    )
    owner_headers = _auth_headers(client, "pptx-owner")
    _submit_student(client, owner_headers, "5025251001", "Kota Surabaya")
    _submit_student(client, owner_headers, "5035251001", "Kota Malang")

    other_headers = _auth_headers(client, "pptx-other")
    _submit_student(client, other_headers, "5025251002", "Kota Jakarta")

    response = client.get(
        "/api/students/export/pptx",
        params={"major": "Teknik Informatika"},
        headers=owner_headers,
    )

    assert response.status_code == 200
    assert response.headers["content-type"] == (
        "application/vnd.openxmlformats-officedocument.presentationml.presentation"
    )
    assert "bukang-mahasiswa-" in response.headers["content-disposition"]
    assert response.headers["content-disposition"].endswith('.pptx"')

    slide_texts = _pptx_slide_texts(response.content)
    assert len(slide_texts) == 1
    assert "Naura Rizky Ameira" in slide_texts[0]
    assert "Kota Surabaya" in slide_texts[0]
    assert "keren" in slide_texts[0]
    assert "Ramah dan seru" not in slide_texts[0]
    assert "Muhammad Faris Alfarrel" not in slide_texts[0]
    assert "Rekayasa Perangkat Lunak" not in slide_texts[0]
