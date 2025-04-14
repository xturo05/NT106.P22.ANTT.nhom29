from django.shortcuts import get_object_or_404, render
from rest_framework import generics

from users.models import Room
from .serializers import RegisterSerializer, RoomInfoSerializer
from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework_simplejwt.views import TokenObtainPairView
from .serializers import MyTokenObtainPairSerializer
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from rest_framework.decorators import permission_classes
from django.contrib.auth.decorators import login_required
from django.views.decorators.csrf import csrf_exempt
from .serializers import RoomCreateSerializer
from rest_framework import generics, permissions
class RegisterView(generics.CreateAPIView):
    serializer_class = RegisterSerializer

class UserMeView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        return Response({
            'id': user.id,
            'username': user.username,
            'email': user.email,
            'phone': user.phone
        })
    

class MyTokenObtainPairView(TokenObtainPairView):
    serializer_class = MyTokenObtainPairSerializer

def login_view(request):
    return render(request, 'login.html')


def home(request):
    username = request.user.username
    return render(request, 'home.html', {'username': username})


class RoomCreateView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        serializer = RoomCreateSerializer(data=request.data, context={'request': request})
        if serializer.is_valid():
            room = serializer.save()
            return Response(RoomCreateSerializer(room).data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
class RoomListView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        rooms = Room.objects.all()
        serializer = RoomCreateSerializer(rooms, many=True)
        return Response(serializer.data)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def room_info(request, room_id):
    room = get_object_or_404(Room, id=room_id)
    serializer = RoomInfoSerializer(room)
    return Response(serializer.data)


def chat_room_view(request, room_id):
    room = get_object_or_404(Room, id=room_id)
    is_owner = (request.user == room.owner)
    context = {
        'room_id': room_id,
        'room_name': room.name,
        'room_owner_id': room.owner.id,
        'room_owner': room.owner.username,
        'room_members': room.members.all(),  # Lấy danh sách thành viên trong phòng
        'member_count': room.members.count(), # Đếm số lượng thành viên trong phòng
    }
    # Trả về template 'chat.html' (bạn cần tạo file này ở bước sau)
    # Đảm bảo đường dẫn template đúng cấu trúc project của bạn
    return render(request, 'chat.html', context)