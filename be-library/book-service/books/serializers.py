# be/book-service/books/serializers.py

from rest_framework import serializers
from django.utils import timezone
from .models import Book, BorrowRecord

class BookSerializer(serializers.ModelSerializer):
    image_url = serializers.SerializerMethodField()
    
    class Meta:
        model = Book
        fields = '__all__'
        read_only_fields = ('available_quantity',)
    
    def get_image_url(self, obj):
        if obj.image:
            request = self.context.get('request')
            if request:
                # Check if request came through API Gateway (port 8002)
                host = request.get_host()
                if '8002' in host:
                    # Request came through API Gateway, use API Gateway URL for media
                    scheme = request.scheme
                    return f"{scheme}://{host}{obj.image.url}"
                else:
                    # Request came directly to Django service
                    return request.build_absolute_uri(obj.image.url)
            # Fallback: use API Gateway URL (port 8002) since frontend uses API Gateway
            return f"http://localhost:8002{obj.image.url}"
        return None 

class BorrowRecordSerializer(serializers.ModelSerializer):
    book_title = serializers.CharField(source='book.title', read_only=True)
    days_remaining = serializers.SerializerMethodField()
    is_overdue = serializers.SerializerMethodField()
    
    class Meta:
        model = BorrowRecord
        fields = ('id', 'book', 'book_title', 'user_id', 'borrower_name', 'borrower_email',
                  'borrow_date', 'due_date', 'status', 'days_remaining', 'is_overdue')
        read_only_fields = ('user_id', 'borrow_date', 'status', 'days_remaining', 'is_overdue')
    
    def get_days_remaining(self, obj):
        """Tính số ngày còn lại (helper field cho frontend, tính tại thời điểm request)"""
        if obj.due_date and obj.status == 'BORROWED':
            now = timezone.now()
            if obj.due_date > now:
                delta = obj.due_date - now
                return max(0, delta.days)
            else:
                return 0
        return None
    
    def get_is_overdue(self, obj):
        """Kiểm tra sách có quá hạn không (helper field cho frontend)"""
        if obj.due_date and obj.status == 'BORROWED':
            return timezone.now() > obj.due_date
        return False