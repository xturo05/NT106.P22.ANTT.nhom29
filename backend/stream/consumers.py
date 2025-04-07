# backend/stream/consumers.py
import json
from channels.generic.websocket import AsyncWebsocketConsumer

class ChatConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.stream_code = self.scope['url_route']['kwargs']['stream_code']
        self.user_id = self.scope['url_route']['kwargs']['user_id']
        self.room_group_name = f'chat_{self.stream_code}'

        print(f"User '{self.user_id}' connecting to group '{self.room_group_name}'...")

        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )
        await self.accept()
        print(f"User '{self.user_id}' connected. Channel: {self.channel_name}")

        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'system_message',
                'message': {
                    'type': 'system',
                    'payload': f"User '{self.user_id}' đã tham gia phòng."
                }
            }
        )

    async def disconnect(self, close_code):
        print(f"User '{self.user_id}' disconnecting... Code: {close_code}")
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'system_message',
                'message': {
                    'type': 'system',
                    'payload': f"User '{self.user_id}' đã rời phòng."
                }
            }
        )
        await self.channel_layer.group_discard(
            self.room_group_name,
            self.channel_name
        )
        print(f"User '{self.user_id}' disconnected.")

    async def receive(self, text_data):
        try:
            # Backend hiện tại chỉ xử lý text đơn giản gửi từ frontend như tin nhắn chat
            # Nó sẽ format lại thành JSON trước khi broadcast
            print(f"Received raw text from '{self.user_id}': {text_data}")
            message_payload = f"{self.user_id}: {text_data}"

            event_data = {
                'type': 'chat', # Luôn là type 'chat' vì chỉ nhận text
                'payload': message_payload,
                'sender_user_id': self.user_id,
                'sender_channel_name': self.channel_name
            }

            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'chat', # Gọi hàm xử lý 'chat'
                    'message': event_data
                }
            )

        except Exception as e:
            print(f"Error processing received data from '{self.user_id}': {e}")

    # --- Các hàm xử lý sự kiện nhận được từ group_send ---
    async def chat(self, event):
        message_data = event['message']
        await self.send(text_data=json.dumps(message_data))
        print(f"Sent chat to '{self.user_id}'")

    async def system_message(self, event):
        message_data = event['message']
        await self.send(text_data=json.dumps(message_data))
        print(f"Sent system message to '{self.user_id}'")

    # Các hàm cho offer, answer, candidate - sẽ dùng ở bước WebRTC
    async def offer(self, event):
        message_data = event['message']
        sender_channel_name = message_data.get('sender_channel_name')
        if self.channel_name != sender_channel_name:
            await self.send(text_data=json.dumps(message_data))
            print(f"Sent offer from {message_data.get('sender_user_id')} to '{self.user_id}'")

    async def answer(self, event):
        message_data = event['message']
        sender_channel_name = message_data.get('sender_channel_name')
        if self.channel_name != sender_channel_name:
            await self.send(text_data=json.dumps(message_data))
            print(f"Sent answer from {message_data.get('sender_user_id')} to '{self.user_id}'")

    async def candidate(self, event):
        message_data = event['message']
        sender_channel_name = message_data.get('sender_channel_name')
        if self.channel_name != sender_channel_name:
            await self.send(text_data=json.dumps(message_data))
            print(f"Sent candidate from {message_data.get('sender_user_id')} to '{self.user_id}'")