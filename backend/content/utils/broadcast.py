from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync
from django.conf import settings
from ..models import Content
from django.urls import reverse

def broadcast_download(request_id, content_name, client_id, progress, content_id=None):
    channel_layer = get_channel_layer()
    group_name = f"downloads_{client_id}"

    # 파일 다운로드 URL 생성
    download_url = None
    download_url = None
    if content_id:
        try:
            content = Content.objects.get(id=content_id)

            print(f"[broadcast] file name: {content.file.name}")
            print(f"[broadcast] file url: {content.file.url}")
            print(f"[broadcast] full url: {settings.SITE_DOMAIN}{content.file.url}")

            if content.file:
                # download_url = f"{settings.SITE_DOMAIN}{content.file.url}" / 기존: f"{settings.SITE_DOMAIN}/api/download-direct/{content.id}/"
                download_url = reverse("download_direct", args=[content.id])
            else:
                print(f"[broadcast] Content({content_id}) 파일이 없음.")
        except Content.DoesNotExist:
            print(f"[broadcast] Content({content_id}) 존재하지 않음.")
            pass
    async_to_sync(channel_layer.group_send)(
        group_name,
        {
            "type":         "download.progress",
            "job_id":       request_id,
            "status":       "in_progress" if progress < 100 else "success",
            "percent":      progress,
            "content_name": content_name,
            "client_id":    client_id,
            "content_id":   content_id,
            "download_url": download_url,
        }
    )