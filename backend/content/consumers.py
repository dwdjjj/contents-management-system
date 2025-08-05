from channels.generic.websocket import AsyncJsonWebsocketConsumer

class DownloadConsumer(AsyncJsonWebsocketConsumer):
    async def connect(self):
        # URL 라우팅에서 client_id 를 받아 그룹을 동적으로 지정
        self.client_id = self.scope['url_route']['kwargs']['client_id']
        self.group_name = f"downloads_{self.client_id}"
        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(self.group_name, self.channel_name)

    async def receive(self, text_data):
        # 클라이언트 -> 서버 메시지 추가 예정
        pass

    # 태스크에서 보낸 'type': 'download.progress' 이벤트 처리
    async def download_progress(self, event):
        await self.send_json({
            "job_id":  event["job_id"],
            "status":  event["status"],
            "percent": event["percent"],
            "content_name": event["content_name"],
            "client_id":    event["client_id"],
            "content_id":  event.get("content_id"),
            "download_url": event.get("download_url"),
        })
