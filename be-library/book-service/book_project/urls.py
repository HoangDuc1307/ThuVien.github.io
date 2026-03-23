# be/book-service/book_project/urls.py
from django.contrib import admin
from django.urls import path, include
from django.http import JsonResponse
from django.conf import settings
from django.conf.urls.static import static

def root_view(request):
    return JsonResponse({
        'service': 'Book Service',
        'port': 8001,
        'message': 'Book Service is running',
        'endpoints': {
            'books': '/api/books/books/',
            'borrow': '/api/books/books/borrow/<id>/',
            'return': '/api/books/books/return/<id>/',
            'history': '/api/books/books/history/'
        }
    })

urlpatterns = [
    path('admin/', admin.site.urls),
    path('', root_view),
    path('', include('books.urls')),  # ✅ Phải có dòng này
]

# Serve media files in development
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)