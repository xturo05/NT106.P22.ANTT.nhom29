# backend/stream/routing.py
from django.urls import re_path

# Import consumer mà chúng ta sẽ tạo ở bước sau
from . import consumers

websocket_urlpatterns = [
    # Định nghĩa một đường dẫn WebSocket
    # re_path sử dụng regular expression để khớp URL
    # Nó sẽ khớp với các URL dạng ws://<domain>/ws/<stream_code>/<user_id>/
    # và chuyển kết nối đến ChatConsumer
    re_path(r'ws/(?P<stream_code>\w+)/(?P<user_id>\w+)/$', consumers.ChatConsumer.as_asgi()),
    # Bạn có thể thêm các đường dẫn WebSocket khác ở đây nếu cần
]