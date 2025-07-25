from django.urls import re_path
from .consumers import DownloadTrackingConsumer

websocket_urlpatterns = [
    re_path(r'ws/downloads/$', DownloadTrackingConsumer.as_asgi()),
]