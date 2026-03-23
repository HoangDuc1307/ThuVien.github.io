from rest_framework import serializers
from django.contrib.auth.models import User
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

class UserSerializer(serializers.ModelSerializer):
    name = serializers.CharField(source="username")

    class Meta:
        model = User
        fields = ("id", "name", "email")

class MyTokenObtainPairSerializer(TokenObtainPairSerializer):
    @classmethod
    def get_token(cls, user):
        # Lấy token mặc định
        token = super().get_token(user)
        
        # ✅ Thêm thông tin phân quyền vào Payload của JWT
        token['username'] = user.username
        token['is_staff'] = user.is_staff
        token['is_superuser'] = user.is_superuser
        
        return token

    def validate(self, attrs):
        data = super().validate(attrs)
        # ✅ Trả về thông tin này trong Response để Frontend lưu vào LocalStorage
        data.update({
            'success': True,
            'message': 'Đăng nhập thành công',
            'id': self.user.id,
            'username': self.user.username,
            'email': self.user.email,
            'is_staff': self.user.is_staff,
            'access_token': data['access']
        })
        return data

class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=6)

    class Meta:
        model = User
        fields = ("username", "password", "email")

    def validate_username(self, value):
        if User.objects.filter(username=value).exists():
            raise serializers.ValidationError("Username đã tồn tại.")
        return value

    def validate_email(self, value):
        if value and User.objects.filter(email=value).exists():
            raise serializers.ValidationError("Email đã được sử dụng.")
        return value

    def create(self, validated_data):
        # Đăng ký user thường (is_staff = False, is_superuser = False)
        user = User.objects.create_user(
            username=validated_data["username"],
            email=validated_data.get("email", ""),
            password=validated_data["password"],
        )
        user.is_staff = False
        user.is_superuser = False
        user.save()
        return user