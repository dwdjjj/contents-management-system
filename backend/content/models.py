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
    
    version = models.CharField(max_length=20, default='1.0.0')
    type = models.CharField(max_length=20, choices=ContentType.choices, default=ContentType.ORIGINAL)
    file = models.FileField(upload_to='uploads/')
    parent = models.ForeignKey('self', null=True, blank=True, on_delete=models.SET_NULL)

    def __str__(self):
        return f"{self.name} [{self.type}] v{self.version}"
    
class DownloadHistory(models.Model):
    content = models.ForeignKey(Content, on_delete=models.CASCADE)
    client_id = models.CharField(max_length=255)  # 디바이스 UUID 혹은 키
    success = models.BooleanField(default=True)
    timestamp = models.DateTimeField(auto_now_add=True)

class ContentDependency(models.Model):
    content = models.ForeignKey(Content, on_delete=models.CASCADE, related_name='dependencies')
    required = models.ForeignKey(Content, on_delete=models.CASCADE, related_name='required_by')
