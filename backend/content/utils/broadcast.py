from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync

def broadcast_download(request_id, content_name, client_id, progress):
    channel_layer = get_channel_layer()
    async_to_sync(channel_layer.group_send)(
        "downloads",
        {
            "type": "download.event",
            "request_id": request_id,
            "content_name": content_name,
            "client_id": client_id,
            "progress": progress,
        }
    )