from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync

def broadcast_download(request_id, content_name, client_id, progress, content_id=None):
    channel_layer = get_channel_layer()
    group_name = f"downloads_{client_id}"
    async_to_sync(channel_layer.group_send)(
        group_name,
        {
            "type":    "download.progress",
            "job_id":  request_id,
            "status":  "in_progress" if progress < 100 else "success",
            "percent": progress,
            "content_name": content_name,
            "client_id":    client_id,
            "content_id":   content_id,
        }
    )