import io
import ssl
import threading
import time
import zipfile
from xml.etree import ElementTree

from PIL import Image

from app.infrastructure.export import pptx_generator
from app.infrastructure.export.pptx_generator import generate_pptx, load_photo
from app.infrastructure.persistence.models.student import StudentModel


def test_generate_pptx_allows_an_empty_student_list():
    result = generate_pptx([])

    with zipfile.ZipFile(result) as archive:
        slides = [
            name
            for name in archive.namelist()
            if name.startswith("ppt/slides/slide") and name.endswith(".xml")
        ]
    assert slides == []


def test_generate_pptx_uses_disk_backed_temporary_output():
    result = generate_pptx([])

    assert not isinstance(result, io.BytesIO)
    assert result.fileno() >= 0


def test_generate_pptx_uses_garet_for_all_generated_text():
    student = StudentModel(
        user_id="user-1",
        nrp="5025251001",
        name="Naura Rizky Ameira",
        major="Teknik Informatika",
        hometown="Kota Surabaya",
        hobbies="Membaca,Musik",
    )

    result = generate_pptx([student])

    namespaces = {
        "a": "http://schemas.openxmlformats.org/drawingml/2006/main",
    }
    with zipfile.ZipFile(result) as archive:
        slide = ElementTree.fromstring(archive.read("ppt/slides/slide1.xml"))
    typefaces = {
        font.attrib["typeface"]
        for font in slide.findall(".//a:latin", namespaces)
    }
    assert typefaces == {"Garet"}


def test_generate_pptx_preserves_student_photo_aspect_ratio():
    photo = io.BytesIO()
    Image.new("RGB", (200, 100), "blue").save(photo, format="PNG")
    student = StudentModel(
        user_id="user-1",
        nrp="5025251001",
        name="Naura Rizky Ameira",
        major="Teknik Informatika",
        hometown="Kota Surabaya",
        hobbies="Membaca,Musik",
        first_impression="Ramah dan seru",
        photo_url="/uploads/naura.png",
    )

    result = generate_pptx([student], photo_loader=lambda _: photo.getvalue())

    namespaces = {
        "p": "http://schemas.openxmlformats.org/presentationml/2006/main",
        "a": "http://schemas.openxmlformats.org/drawingml/2006/main",
    }
    with zipfile.ZipFile(result) as archive:
        slide = ElementTree.fromstring(archive.read("ppt/slides/slide1.xml"))
    picture_extents = slide.findall(".//p:pic/p:spPr/a:xfrm/a:ext", namespaces)
    assert len(picture_extents) == 2
    photo_width = int(picture_extents[1].attrib["cx"])
    photo_height = int(picture_extents[1].attrib["cy"])
    assert abs((photo_width / photo_height) - 2.0) < 0.01


def test_generate_pptx_downsizes_oversized_photos_before_embedding():
    photo = io.BytesIO()
    Image.new("RGB", (3200, 2000), "blue").save(photo, format="PNG")
    student = StudentModel(
        user_id="user-1",
        nrp="5025251001",
        name="Naura Rizky Ameira",
        major="Teknik Informatika",
        hometown="Kota Surabaya",
        hobbies="Membaca,Musik",
        photo_url="/uploads/naura.png",
    )

    result = generate_pptx([student], photo_loader=lambda _: photo.getvalue())

    embedded_images = []
    with zipfile.ZipFile(result) as archive:
        for name in archive.namelist():
            if not name.startswith("ppt/media/"):
                continue
            with Image.open(io.BytesIO(archive.read(name))) as image:
                embedded_images.append((image.width * image.height, image.format, image.size))
    _, photo_format, photo_size = min(embedded_images)
    assert photo_format == "JPEG"
    assert photo_size == (1600, 1000)


def test_optimize_photo_requests_reduced_jpeg_decoding(monkeypatch):
    photo = io.BytesIO()
    Image.new("RGB", (3200, 2000), "blue").save(photo, format="JPEG")
    original_open = Image.open
    draft_calls = []

    class DraftTrackingImage:
        def __init__(self, source):
            self.source = source

        def __enter__(self):
            return self

        def __exit__(self, *args):
            self.source.close()

        def __getattr__(self, name):
            return getattr(self.source, name)

        def draft(self, mode, size):
            draft_calls.append((mode, size))
            return self.source.draft(mode, size)

    monkeypatch.setattr(
        pptx_generator.Image,
        "open",
        lambda stream: DraftTrackingImage(original_open(stream)),
    )

    optimized = pptx_generator.optimize_photo(photo.getvalue())

    assert optimized is not None
    assert draft_calls == [("RGB", (1600, 1600))]


def test_optimize_photo_applies_exif_orientation_before_removing_metadata():
    photo = io.BytesIO()
    exif = Image.Exif()
    exif[274] = 6
    Image.new("RGB", (2000, 1000), "blue").save(photo, format="JPEG", exif=exif)

    optimized = pptx_generator.optimize_photo(photo.getvalue())

    assert optimized is not None
    with Image.open(io.BytesIO(optimized)) as image:
        assert image.size == (800, 1600)


def test_optimize_photo_skips_exif_copy_when_orientation_is_normal(monkeypatch):
    photo = io.BytesIO()
    Image.new("RGB", (2000, 1000), "blue").save(photo, format="JPEG")
    transpose_calls = 0
    original_transpose = pptx_generator.ImageOps.exif_transpose

    def tracked_transpose(image):
        nonlocal transpose_calls
        transpose_calls += 1
        return original_transpose(image)

    monkeypatch.setattr(pptx_generator.ImageOps, "exif_transpose", tracked_transpose)

    optimized = pptx_generator.optimize_photo(photo.getvalue())

    assert optimized is not None
    assert transpose_calls == 0


def test_generate_pptx_fetches_student_photos_concurrently():
    photo_bytes = {}
    for index, color in ((1, "blue"), (2, "red")):
        photo = io.BytesIO()
        Image.new("RGB", (20, 10), color).save(photo, format="PNG")
        photo_bytes[str(index)] = photo.getvalue()
    students = [
        StudentModel(
            user_id="user-1",
            nrp=f"502525100{index}",
            name=f"Student {index}",
            major="Teknik Informatika",
            hometown="Kota Surabaya",
            hobbies="Membaca",
            photo_url=f"https://huggingface.co/buckets/team/resolve/{index}.png",
        )
        for index in (1, 2)
    ]
    both_downloads_started = threading.Barrier(2)

    def photo_loader(url):
        try:
            both_downloads_started.wait(timeout=0.2)
        except threading.BrokenBarrierError:
            return None
        return photo_bytes[url.removesuffix(".png").rsplit("/", 1)[-1]]

    result = generate_pptx(students, photo_loader=photo_loader)

    with zipfile.ZipFile(result) as archive:
        embedded_media = [
            name for name in archive.namelist() if name.startswith("ppt/media/")
        ]
    assert len(embedded_media) == 3


def test_generate_pptx_keeps_downloading_past_a_slow_photo():
    photo = io.BytesIO()
    Image.new("RGB", (20, 10), "blue").save(photo, format="PNG")
    students = [
        StudentModel(
            user_id="user-1",
            nrp=f"5025251{index:03d}",
            name=f"Student {index}",
            major="Teknik Informatika",
            hometown="Kota Surabaya",
            hobbies="Membaca",
            photo_url=f"/uploads/{index}.png",
        )
        for index in range(10)
    ]
    ninth_photo_started = threading.Event()
    ninth_started_while_first_was_waiting = []

    def photo_loader(url):
        if url.endswith("/0.png"):
            ninth_started_while_first_was_waiting.append(
                ninth_photo_started.wait(timeout=0.3)
            )
        if url.endswith("/8.png"):
            ninth_photo_started.set()
        return photo.getvalue()

    generate_pptx(students, photo_loader=photo_loader)

    assert ninth_started_while_first_was_waiting == [True]


def test_generate_pptx_optimizes_one_photo_at_a_time_to_bound_decoded_memory(monkeypatch):
    photo = io.BytesIO()
    Image.new("RGB", (20, 10), "blue").save(photo, format="PNG")
    students = [
        StudentModel(
            user_id="user-1",
            nrp=f"5025251{index:03d}",
            name=f"Student {index}",
            major="Teknik Informatika",
            hometown="Kota Surabaya",
            hobbies="Membaca",
            photo_url=f"/uploads/{index}.png",
        )
        for index in range(4)
    ]
    active = 0
    max_active = 0
    lock = threading.Lock()
    original_optimize = pptx_generator.optimize_photo

    def tracked_optimize(content):
        nonlocal active, max_active
        with lock:
            active += 1
            max_active = max(max_active, active)
        time.sleep(0.03)
        optimized = original_optimize(content)
        with lock:
            active -= 1
        return optimized

    monkeypatch.setattr(pptx_generator, "optimize_photo", tracked_optimize)

    generate_pptx(students, photo_loader=lambda _url: photo.getvalue())

    assert max_active == 1


def test_generate_pptx_reuses_cached_optimized_photos(tmp_path):
    photo = io.BytesIO()
    Image.new("RGB", (200, 100), "blue").save(photo, format="PNG")
    student = StudentModel(
        user_id="user-1",
        nrp="5025251001",
        name="Student 1",
        major="Teknik Informatika",
        hometown="Kota Surabaya",
        hobbies="Membaca",
        photo_url="/uploads/cached-photo.png",
    )
    load_count = 0

    def photo_loader(_url):
        nonlocal load_count
        load_count += 1
        return photo.getvalue()

    first = generate_pptx(
        [student],
        photo_loader=photo_loader,
        photo_cache_dir=tmp_path,
    )
    first.close()
    second = generate_pptx(
        [student],
        photo_loader=photo_loader,
        photo_cache_dir=tmp_path,
    )
    second.close()

    assert load_count == 1


def test_stream_photo_to_disk_writes_remote_response_in_chunks(tmp_path):
    expected = b"remote-photo-content"
    requested_chunk_sizes = []

    class FakeResponse:
        def __enter__(self):
            return self

        def __exit__(self, *_):
            return None

        def raise_for_status(self):
            return None

        def iter_bytes(self, chunk_size):
            requested_chunk_sizes.append(chunk_size)
            yield expected[:7]
            yield expected[7:]

    class FakeClient:
        def stream(self, method, url):
            assert method == "GET"
            assert url.startswith("https://huggingface.co/buckets/")
            return FakeResponse()

    stream_photo = getattr(pptx_generator, "stream_photo_to_disk", None)

    result = (
        stream_photo(
            0,
            "https://huggingface.co/buckets/team/photos/resolve/student.jpg",
            tmp_path,
            FakeClient(),
        )
        if stream_photo is not None
        else None
    )

    assert result is not None
    assert result.read_bytes() == expected
    assert requested_chunk_sizes == [64 * 1024]


def test_generate_pptx_default_downloader_uses_one_shared_client(tmp_path, monkeypatch):
    uploads = tmp_path / "uploads"
    uploads.mkdir()
    photo = io.BytesIO()
    Image.new("RGB", (20, 10), "blue").save(photo, format="PNG")
    (uploads / "one.png").write_bytes(photo.getvalue())
    (uploads / "two.png").write_bytes(photo.getvalue())
    students = [
        StudentModel(
            user_id="user-1",
            nrp=f"502525100{index}",
            name=f"Student {index}",
            major="Teknik Informatika",
            hometown="Kota Surabaya",
            hobbies="Membaca",
            photo_url=f"/uploads/{filename}",
        )
        for index, filename in ((1, "one.png"), (2, "two.png"))
    ]
    client_creations = 0

    class FakeClient:
        def __enter__(self):
            return self

        def __exit__(self, *_):
            return None

    def create_client():
        nonlocal client_creations
        client_creations += 1
        return FakeClient()

    monkeypatch.chdir(tmp_path)
    monkeypatch.setattr(
        pptx_generator,
        "create_photo_http_client",
        create_client,
        raising=False,
    )

    result = generate_pptx(students, photo_cache_dir=tmp_path / "cache")
    result.close()

    assert client_creations == 1


def test_load_photo_reads_files_from_local_app_uploads(tmp_path, monkeypatch):
    uploads = tmp_path / "uploads"
    uploads.mkdir()
    expected = b"local-photo-content"
    (uploads / "student.jpg").write_bytes(expected)
    monkeypatch.chdir(tmp_path)

    assert load_photo("/uploads/student.jpg") == expected


def test_load_photo_reuses_the_trusted_ssl_context(monkeypatch):
    expected = b"remote-photo-content"
    trusted_context = ssl.create_default_context()
    context_creations = 0

    class FakeResponse:
        def __enter__(self):
            return self

        def __exit__(self, *_):
            return None

        def read(self):
            return expected

    def context_factory(*_args, **_kwargs):
        nonlocal context_creations
        context_creations += 1
        return trusted_context

    def opener(_url: str, timeout: int, context=None):
        assert timeout == 15
        assert context is trusted_context
        return FakeResponse()

    monkeypatch.setattr(pptx_generator, "_SSL_CONTEXT", None, raising=False)
    monkeypatch.setattr(pptx_generator.ssl, "create_default_context", context_factory)
    trusted_url = "https://huggingface.co/buckets/team/photos/resolve/uploads/student.jpg"

    assert load_photo(trusted_url, opener=opener) == expected
    assert load_photo(trusted_url, opener=opener) == expected
    assert context_creations == 1


def test_load_photo_downloads_only_hugging_face_bucket_photos():
    expected = b"remote-photo-content"

    class FakeResponse:
        def __enter__(self):
            return self

        def __exit__(self, *_):
            return None

        def read(self):
            return expected

    def opener(_url: str, timeout: int, context=None):
        assert timeout == 15
        return FakeResponse()

    trusted_url = "https://huggingface.co/buckets/team/photos/resolve/uploads/student.jpg"
    assert load_photo(trusted_url, opener=opener) == expected
    assert load_photo("https://example.com/student.jpg", opener=opener) is None


def test_load_photo_uses_a_trusted_ssl_context_for_hugging_face():
    expected = b"remote-photo-content"

    class FakeResponse:
        def __init__(self, content: bytes):
            self.content = content

        def __enter__(self):
            return self

        def __exit__(self, *_):
            return None

        def read(self):
            return self.content

    def opener(_url: str, timeout: int, context=None):
        assert timeout == 15
        has_trusted_cas = isinstance(context, ssl.SSLContext) and bool(context.get_ca_certs())
        return FakeResponse(expected if has_trusted_cas else b"")

    trusted_url = "https://huggingface.co/buckets/team/photos/resolve/uploads/student.jpg"
    assert load_photo(trusted_url, opener=opener) == expected
