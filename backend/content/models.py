from django.db import models

# Create your models here.
class Content(models.Model):
    name = models.CharField(max_length=100)
    uploaded_at = models.DateTimeField(auto_now_add=True)
    meta_info = models.JSONField()
    
    class ContentType(models.TextChoices):
        ORIGINAL = 'original'
        HIGH = 'high'
        NORMAL = 'normal'
        LOW = 'low'

    class ConversionStatus(models.TextChoices):
        PENDING     = 'pending'
        IN_PROGRESS = 'in_progress'
        SUCCESS     = 'success'
        FAILED      = 'failed'
    
    version = models.CharField(max_length=20, default='1.0.0')
    type = models.CharField(max_length=20, choices=ContentType.choices, default=ContentType.ORIGINAL)
    file = models.FileField(upload_to='uploads/')
    parent = models.ForeignKey(
        'self',
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='variants'
    )
    conversion_status = models.CharField(
        max_length=20,
        choices=ConversionStatus.choices,
        default=ConversionStatus.PENDING
    )

    # 자동 변환 파이프라인 상태를 저장
    conversion_status = models.CharField(
        max_length=20,
        choices=ConversionStatus.choices,
        default=ConversionStatus.PENDING
    )

    def __str__(self):
        return f"{self.name} [{self.type}] v{self.version}"
    
class DownloadJob(models.Model):
    STATUS_PENDING    = 'pending'
    STATUS_INPROGRESS = 'in_progress'
    STATUS_SUCCESS    = 'success'
    STATUS_FAILED     = 'failed'
    STATUS_CHOICES = [
        (STATUS_PENDING, 'Pending'),
        (STATUS_INPROGRESS, 'In Progress'),
        (STATUS_SUCCESS, 'Success'),
        (STATUS_FAILED, 'Failed'),
    ]

    content      = models.ForeignKey(Content, on_delete=models.CASCADE)
    client_id    = models.CharField(max_length=255)
    requested_at = models.DateTimeField(auto_now_add=True)
    started_at   = models.DateTimeField(null=True, blank=True)
    finished_at  = models.DateTimeField(null=True, blank=True)
    status       = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default=STATUS_PENDING
    )
    priority     = models.IntegerField(default=0)
    attempts     = models.IntegerField(default=0)
    percent      = models.IntegerField(default=0)

    class Meta:
        ordering = ['-priority', 'requested_at']



class DownloadHistory(models.Model):
    content = models.ForeignKey(Content, on_delete=models.CASCADE)
    client_id = models.CharField(max_length=255)  # 디바이스 UUID 혹은 키
    success = models.BooleanField(default=True)
    timestamp = models.DateTimeField(auto_now_add=True)

class ContentDependency(models.Model):
    content = models.ForeignKey(Content, on_delete=models.CASCADE, related_name='dependencies')
    required = models.ForeignKey(Content, on_delete=models.CASCADE, related_name='required_by')
