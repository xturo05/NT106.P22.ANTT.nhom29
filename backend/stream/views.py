from django.shortcuts import render

# Create your views here.
# backend/stream/views.py
from django.http import JsonResponse
import datetime

def api_root(request):
    # View cho đường dẫn gốc '/'
    now = datetime.datetime.now(datetime.timezone.utc).astimezone(datetime.timezone(datetime.timedelta(hours=7))) # Giờ Việt Nam
    data = {
        "message": f"Chào bạn từ Django Backend! Thời gian bây giờ là: {now.strftime('%H:%M:%S %d/%m/%Y')}"
    }
    return JsonResponse(data)

# (View này hiện chưa dùng trong core/urls.py ở trên, nhưng có thể dùng sau)
def api_ping(request):
    return JsonResponse({"message": "pong from Django /api/ping/"})