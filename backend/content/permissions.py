def can_download(user, content_obj, job_id: str | None):
    # 익명 불가(필요시 허용으로 변경)
    if not getattr(user, "is_authenticated", False):
        return False

    if getattr(user, "is_staff", False):
        return True

    # 소유자이거나 승인된 Job인 경우만 허용
    if getattr(content_obj, "owner_id", None) == getattr(user, "id", None):
        return True

    if job_id:
        from .models import DownloadJob
        return DownloadJob.objects.filter(
            id=job_id, content=content_obj, client_id=user.id if hasattr(user, "id") else None,
            status=DownloadJob.STATUS_SUCCESS
        ).exists()
    return False
