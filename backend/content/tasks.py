from celery import shared_task
from django.core.files.base import ContentFile
from .models import Content
import os

@shared_task(bind=True, retry_backoff=True, max_retries=3)
def convert_content(self, content_id):
    content = Content.objects.get(pk=content_id)
    content.conversion_status = 'in_progress'
    content.save()

    try:
        # 예시: 실제 변환 로직을 삽입하세요 (ffmpeg, pillow 등)
        with open(content.file.path, 'rb') as f:
            data = f.read()

        base, ext = os.path.splitext(os.path.basename(content.file.name))
        targets = ['high', 'normal', 'low']

        for t in targets:
            new = Content.objects.create(
                name=content.name,
                version=content.version,
                type=t,
                meta_info=content.meta_info,
                conversion_status='pending'
            )
            new.file.save(
                f"{base}_{t}{ext}",
                ContentFile(data),
            )

        content.conversion_status = 'success'
        content.save()
    except Exception as e:
        content.conversion_status = 'failed'
        content.save()
        raise self.retry(exc=e)