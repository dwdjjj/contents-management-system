import json
from channels.generic.websocket import AsyncWebsocketConsumer

class DownloadTrackingConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        await self.channel_layer.group_add("downloads", self.channel_name)
        await self.accept()

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard("downloads", self.channel_name)

    async def receive(self, text_data):
        # 클라이언트가 메시지를 보낼 경우 처리
        pass

    async def download_event(self, event):
        await self.send(text_data=json.dumps({
        'type': 'progress',
        'request_id': event['request_id'],
        'content_name': event['content_name'],
        'client_id': event['client_id'],
        'progress': event['progress'],
    }))
