"""
URL configuration for core project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/5.2/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.contrib import admin
from django.urls import path
from stream import views as stream_views

urlpatterns = [
    path('admin/', admin.site.urls),
    # Đường dẫn gốc ('/') sẽ gọi hàm api_root trong stream/views.py trả về JSON
    path('', stream_views.api_root, name='api_root'),
    # Bạn có thể thêm các đường dẫn API khác ở đây nếu cần, ví dụ:
    # path('api/ping/', stream_views.api_ping, name='api_ping'),
]