from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
from django.contrib.auth.models import User
from .serializers import RegisterSerializer, MyTokenObtainPairSerializer, UserSerializer

class CustomTokenObtainPairViewSerializer(TokenObtainPairSerializer):
    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        token['role'] = 'admin' if user.is_staff else 'user'
        return token
    
@method_decorator(csrf_exempt, name='dispatch')
class LoginView(TokenObtainPairView):
    serializer_class = MyTokenObtainPairSerializer
    permission_classes = (permissions.AllowAny,)  # Cho phép không cần authentication

@method_decorator(csrf_exempt, name='dispatch')
class RegisterView(generics.CreateAPIView):
    permission_classes = (permissions.AllowAny,)
    serializer_class = RegisterSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()

        # Tạo token cho user mới
        refresh = RefreshToken.for_user(user)
        access_token = str(refresh.access_token)

        return Response(
            {
                "message": "Đăng ký thành công",
                "username": user.username,
                "email": user.email,
                "is_staff": user.is_staff,
                "access": access_token,
                "refresh": str(refresh),
            },
            status=status.HTTP_201_CREATED,
        )


class UserListView(generics.ListAPIView):
    """
    Simple endpoint to list all users for the member management table.
    """

    # Chỉ trả về user thường, ẩn các tài khoản admin/staff khỏi danh sách thành viên
    queryset = User.objects.filter(is_staff=False).order_by("id")
    serializer_class = UserSerializer
    permission_classes = (permissions.AllowAny,)