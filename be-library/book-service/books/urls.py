# be/book-service/books/urls.py - FIXED
from django.urls import path
from .views import (
    BookListCreateView, 
    BookRetrieveUpdateDestroyView, 
    BorrowBookView, 
    ReturnBookView,
    UserBorrowHistoryView,
    ApproveBorrowView
)

urlpatterns = [
    path('books/', BookListCreateView.as_view(), name='book-list'),
    path('books/<int:pk>/', BookRetrieveUpdateDestroyView.as_view(), name='book-detail'),
    path('books/borrow/<int:pk>/', BorrowBookView.as_view(), name='borrow-book'),
    path('books/return/<int:pk>/', ReturnBookView.as_view(), name='return-book'),  # pk is now record ID
    path('books/approve/<int:pk>/', ApproveBorrowView.as_view(), name='approve-borrow'),
    path('books/history/', UserBorrowHistoryView.as_view(), name='borrow-history'),
]