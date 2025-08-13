from django.conf import settings
from pathlib import Path

def rel_media_path(absolute_or_field_path: str) -> str:
    # FileField.name은 보통 'uploads/xxx.bin' 형태. 절대경로가 들어오면 MEDIA_ROOT 기준 상대경로로 환원.
    p = Path(absolute_or_field_path)
    try:
        rel = p.relative_to(settings.MEDIA_ROOT)
        return str(rel).replace("\\", "/")
    except Exception:
        return str(absolute_or_field_path).replace("media/", "").lstrip("/").replace("\\", "/")
