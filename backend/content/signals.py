from django.db.models.signals import post_save
from django.dispatch import receiver
from .models import Content
from .tasks import convert_content

@receiver(post_save, sender=Content)
def trigger_conversion(sender, instance, created, **kwargs):
    # 원본 업로드 시 자동 변환 트리거
    if created and instance.type == 'original':
        convert_content.delay(instance.id)