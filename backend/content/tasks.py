from celery import shared_task
from .models import Content, DownloadJob
import os, time
from django.core.files.base import ContentFile
from django.utils import timezone
from django.conf import settings

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
    
@shared_task(bind=True, max_retries=3, default_retry_delay=5)
def process_download_job(self, job_id):
    job = DownloadJob.objects.get(pk=job_id)
    if job.status != DownloadJob.STATUS_PENDING:
        return

@shared_task
def schedule_downloads():
    """
    진행중인(in_progress) 작업 수를 세고,
    빈 슬롯만큼 pending 작업을 우선순위 순으로 꺼내어 처리 태스크 예약하기.
    """
    limit  = getattr(settings, "DOWNLOAD_CONCURRENCY_LIMIT", 3)
    active = DownloadJob.objects.filter(status=DownloadJob.STATUS_INPROGRESS).count()
    slots  = max(limit - active, 0)
    if slots <= 0:
        return

    pending = (
        DownloadJob.objects
        .filter(status=DownloadJob.STATUS_PENDING)
        .order_by("-priority", "requested_at")[:slots]
    )
    for job in pending:
        process_download_job.delay(job.id)