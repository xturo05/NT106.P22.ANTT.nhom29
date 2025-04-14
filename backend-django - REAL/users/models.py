from django.db import models
from django.contrib.auth.models import AbstractUser
# Create your models here.
import uuid  # Import uuid for generating unique IDs

def generate_room_id():
    return str(uuid.uuid4())[:11]  # Generate a unique 11-character ID

class User(AbstractUser):
    email = models.EmailField(unique=True)  # thêm cái này
    phone = models.CharField(max_length=20, blank=True, null=True)

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['username']  # vì kế thừa AbstractUser

    
class Room(models.Model):
    STATUS_CHOICES = (
        ('active', 'Active'),
        ('inactive', 'Inactive'),
    )
    id = models.CharField(primary_key=True, max_length=11, default=generate_room_id, editable=False)
    name = models.CharField(max_length=100)
    owner = models.ForeignKey(User, on_delete=models.CASCADE, related_name='owned_rooms')
    members = models.ManyToManyField(User, through='Room_members', related_name='joined_rooms')
    created_at = models.DateTimeField(auto_now_add=True)
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='active')

    def __str__(self):
        return self.name


class Room_members(models.Model):
    room = models.ForeignKey(Room, on_delete=models.CASCADE)
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    joined_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.user.username} in {self.room.name}"