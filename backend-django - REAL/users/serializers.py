from rest_framework import serializers
from .models import User
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from .models import Room

class RegisterSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['username', 'password', 'email']
        extra_kwargs = {
            'password': {'write_only': True}
        }

    def create(self, validated_data):
        user = User.objects.create_user(
            username=validated_data['username'],
            email=validated_data.get('email', ''),
            password=validated_data['password']
        )
        return user
    

class MyTokenObtainPairSerializer(TokenObtainPairSerializer):
    username_field = User.EMAIL_FIELD

    @classmethod
    def get_token(cls, user):
        # --- THÊM LOG DEBUG ---
        print(f"\n>>> DEBUG: Hàm get_token được gọi cho user ID: {user.id}, Username: {user.username} <<<")
        token = super().get_token(user)
        print(f">>> DEBUG: Payload token GỐC: {token} <<<")
        # --------------------

        # Thêm username
        token['username'] = user.username

        # --- THÊM LOG DEBUG ---
        print(f">>> DEBUG: Payload token SAU KHI thêm username: {token} <<<")
        # --------------------
        return token


class RoomCreateSerializer(serializers.ModelSerializer):
    owner = serializers.StringRelatedField()
    class Meta:
        model = Room
        fields = ['id', 'name', 'status', 'owner', 'members']

    def create(self, validated_data):
        user = self.context['request'].user  # chủ phòng là user đang login
        room = Room.objects.create(owner=user, **validated_data)
        room.members.add(user)  # auto cho chủ phòng vô members luôn
        return room
    
class RoomInfoSerializer(serializers.ModelSerializer):
    owner = serializers.CharField(source='owner.username')

    class Meta:
        model = Room
        fields = ['id', 'name', 'owner', 'created_at']