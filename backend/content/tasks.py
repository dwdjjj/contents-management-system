from celery import shared_task
from django.core.files.base import ContentFile
from .models import Content
import os

@shared_task(bind=True, retry_backoff=True, max_retries=3)
def convert_content(self, content_id):
    orig = Content.objects.get(pk=content_id)
    orig.conversion_status = Content.ConversionStatus.IN_PROGRESS
    orig.save()

    try:
        # 원본 파일 읽기
        with open(orig.file.path, 'rb') as f:
            data = f.read()

        base, ext = os.path.splitext(os.path.basename(orig.file.name))
        targets = ['high', 'normal', 'low']

        for t in targets:
            child = Content.objects.create(
                name=orig.name,
                version=orig.version,
                type=t,
                meta_info=orig.meta_info,
                parent=orig, # ← 부모 연결
                conversion_status=Content.ConversionStatus.PENDING
            )
            child.file.save(f"{base}_{t}{ext}", ContentFile(data))

        orig.conversion_status = Content.ConversionStatus.SUCCESS
        orig.save()
    except Exception as e:
        orig.conversion_status = Content.ConversionStatus.FAILED
        orig.save()
        raise self.retry(exc=e)
