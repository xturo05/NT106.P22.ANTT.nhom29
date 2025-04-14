from django.urls import path
from .views import MyTokenObtainPairView, RegisterView, UserMeView
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from users import views
from .serializers import MyTokenObtainPairSerializer
urlpatterns = [
    path('register/', RegisterView.as_view(), name='register'),
    path('token/', MyTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('me/', UserMeView.as_view(), name='user_me'),
    path('login/', views.login_view, name='home'),
    path('home/', views.home, name='home'),  # Add this line to include the home view
    path('rooms/create/', views.RoomCreateView.as_view(), name='room-create'),
    path('rooms/', views.RoomListView.as_view()),  # <-- API list room
    path('rooms/<str:room_id>/info/', views.room_info, name='room-info'),
    path('chat/<str:room_id>/', views.chat_room_view, name='chat_room'),
]
