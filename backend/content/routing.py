from django.urls import re_path
from .consumers import DownloadConsumer

websocket_urlpatterns = [
    re_path(r'ws/downloads/(?P<client_id>[^/]+)/$', DownloadConsumer.as_asgi()),
]
