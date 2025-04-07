# backend/core/asgi.py
import os
import django
from channels.routing import ProtocolTypeRouter, URLRouter
from channels.auth import AuthMiddlewareStack
from django.core.asgi import get_asgi_application

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup() # Quan trọng: Setup Django trước khi import routing của app

# Import routing của app stream SAU KHI django.setup()
import stream.routing

application = ProtocolTypeRouter({
    # Xử lý HTTP requests bằng ASGI app mặc định của Django
    "http": get_asgi_application(),

    # Xử lý WebSocket requests
    "websocket": AuthMiddlewareStack( # Middleware để có thể dùng user/session
        URLRouter(
            # Trỏ đến routing của app stream
            stream.routing.websocket_urlpatterns
        )
    ),
})