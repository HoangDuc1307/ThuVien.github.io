# be/book-service/books/views.py - COMPLETE VERSION
import json
import os
import urllib.request
from datetime import timedelta

from django.conf import settings
from django.core.mail import send_mail
from django.db import transaction
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Book, BorrowRecord
from .serializers import BookSerializer, BorrowRecordSerializer

# ✅ ALL VIEWS - NO AUTHENTICATION (For Testing)

class BookListCreateView(generics.ListCreateAPIView):
    """
    GET: List all books
    POST: Create new book
    """
    queryset = Book.objects.all()
    serializer_class = BookSerializer
    authentication_classes = []
    permission_classes = []

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context['request'] = self.request
        return context

    def perform_create(self, serializer):
        total = serializer.validated_data.get('total_quantity', 1)
        serializer.save(available_quantity=total)


class BookRetrieveUpdateDestroyView(generics.RetrieveUpdateDestroyAPIView):
    """
    GET: View book detail
    PUT/PATCH: Update book
    DELETE: Delete book
    """
    queryset = Book.objects.all()
    serializer_class = BookSerializer
    authentication_classes = []
    permission_classes = []

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context['request'] = self.request
        return context


class BorrowBookView(APIView):
    """POST: Borrow a book"""
    authentication_classes = []
    permission_classes = []
    
    def post(self, request, pk):
        book = get_object_or_404(Book, pk=pk)
        
        # ✅ GET: Borrower name from request (for librarian use)
        borrower_name = request.data.get('borrower_name', '').strip()
        if not borrower_name:
            return Response(
                {"message": "Vui lòng nhập tên người mượn sách."}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # user_id is optional now (can be None for librarian-managed borrows)
        user_id = request.data.get('user_id', None)
        borrower_email = request.data.get('borrower_email', '') or None
        is_admin_flag = request.data.get('is_admin', False)
        is_admin = str(is_admin_flag).lower() in ['1', 'true', 'yes']
        
        print(f"[DEBUG] Borrow request for book {book.id}")
        print(f"[DEBUG] Borrower: {borrower_name}")
        print(f"[DEBUG] Book: {book.title}, Available: {book.available_quantity}")
        
        # Get due_date from request body, or use default (1 day from now)
        due_date_str = request.data.get('due_date')
        default_due = timezone.now() + timedelta(days=1)
        if due_date_str:
            try:
                from django.utils.dateparse import parse_datetime
                parsed = parse_datetime(due_date_str)
                if parsed is None:
                    print(f"[DEBUG] due_date parse None, fallback default. Raw: {due_date_str}")
                    due_date = default_due
                elif parsed.tzinfo is None:
                    try:
                        due_date = timezone.make_aware(parsed)
                    except Exception as e:
                        # Windows can raise OSError on invalid datetime; fallback
                        print(f"[DEBUG] make_aware error {e}, fallback default. Raw: {due_date_str}")
                        due_date = default_due
                else:
                    due_date = parsed
            except Exception as e:
                print(f"[DEBUG] due_date parse error {e}, fallback default. Raw: {due_date_str}")
                due_date = default_due
        else:
            due_date = default_due
        
        # Validate due_date is in the future
        if due_date <= timezone.now():
            return Response(
                {"message": "Ngày trả sách phải sau ngày hiện tại."}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        print(f"[DEBUG] Due date: {due_date}")
        
        with transaction.atomic():
            # Check if borrower already borrowed this book (active borrows only)
            existing_borrow = BorrowRecord.objects.filter(
                borrower_name=borrower_name,
                book=book, 
                status__in=['BORROWED', 'OVERDUE', 'PENDING']
            )
            
            if existing_borrow.exists():
                print(f"[DEBUG] {borrower_name} already borrowed this book")
                return Response(
                    {"message": f"{borrower_name} đang mượn cuốn sách này rồi."}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Check availability (still check to avoid overbooking)
            if book.available_quantity <= 0:
                print(f"[DEBUG] Book {book.id} is not available (qty: {book.available_quantity})")
                return Response(
                    {"message": "Sách đã hết."}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # If admin -> auto approve; else create PENDING
            if is_admin:
                print(f"[DEBUG] Admin borrow - approving immediately.")
                book.available_quantity -= 1
                book.save()
                status_value = 'BORROWED'
            else:
                print(f"[DEBUG] User borrow - set PENDING for approval.")
                status_value = 'PENDING'
            
            print(f"[DEBUG] Creating borrow record with status {status_value}")
            
            record = BorrowRecord.objects.create(
                user_id=user_id,
                borrower_name=borrower_name,
                borrower_email=borrower_email,
                book=book,
                due_date=due_date,
                status=status_value
            )
            
            # Send email if status is already BORROWED
            if record.status == 'BORROWED':
                self._send_borrow_email(record, action="approved")
            
            print(f"[DEBUG] Book borrowed successfully. New available: {book.available_quantity}")
            
            return Response(
                BorrowRecordSerializer(record).data, 
                status=status.HTTP_201_CREATED
            )

    def _resolve_borrower_email(self, record: BorrowRecord):
        """
        Try to ensure record.borrower_email is populated.
        Priority:
          1) Existing borrower_email on record
          2) Fetch from User Service by user_id (if provided)
        """
        if record.borrower_email:
            return record.borrower_email

        if not record.user_id:
            print("[DEBUG] No borrower_email and no user_id; cannot resolve email.")
            return None

        user_service_base = os.getenv("USER_SERVICE_URL", "http://localhost:8000/users")
        # Try /users/{id}/ and /users/{id} (with/without trailing slash)
        candidates = [
            f"{user_service_base}/{record.user_id}/",
            f"{user_service_base}/{record.user_id}",
        ]

        for url in candidates:
            try:
                with urllib.request.urlopen(url, timeout=3) as resp:
                    if resp.status != 200:
                        continue
                    data = json.loads(resp.read().decode("utf-8"))
                    email = data.get("email") or data.get("user_email")
                    name = data.get("name") or data.get("username")
                    if email:
                        record.borrower_email = email
                        # Update borrower_name if missing and response has name
                        if not record.borrower_name and name:
                            record.borrower_name = name
                        record.save(update_fields=["borrower_email", "borrower_name"])
                        print(f"[DEBUG] Resolved borrower_email from user service: {email}")
                        return email
            except Exception as e:
                print(f"[DEBUG] Failed to resolve email from {url}: {e}")

        print("[DEBUG] Could not resolve borrower_email from user service.")
        return None

    def _send_borrow_email(self, record: BorrowRecord, action: str):
        """Send notification email; swallow errors if email misconfigured."""
        if not record.borrower_email:
            # Try to resolve from user service using user_id
            self._resolve_borrower_email(record)
            if not record.borrower_email:
                print("[DEBUG] No borrower_email provided and cannot resolve, skip email.")
                return
        try:
            subject = f"Thông báo mượn sách: {record.book.title}"
            borrow_date = record.borrow_date.astimezone().strftime("%d/%m/%Y %H:%M")
            due_date = record.due_date.astimezone().strftime("%d/%m/%Y %H:%M")
            body = (
                f"Xin chào {record.borrower_name or 'bạn'},\n\n"
                f"Yêu cầu mượn sách của bạn đã được {'duyệt' if action == 'approved' else 'tạo'}.\n"
                f"Sách: {record.book.title}\n"
                f"Ngày mượn: {borrow_date}\n"
                f"Ngày trả: {due_date}\n\n"
                "Cảm ơn bạn đã sử dụng thư viện!"
            )
            from_email = getattr(settings, "DEFAULT_FROM_EMAIL", "tungbi31032004@gmail.com")
            print(
                f"[DEBUG] Sending email via SMTP:\n"
                f"  HOST={getattr(settings, 'EMAIL_HOST', None)}:{getattr(settings, 'EMAIL_PORT', None)}\n"
                f"  USER={getattr(settings, 'EMAIL_HOST_USER', None)}\n"
                f"  FROM={from_email}\n"
                f"  TO={record.borrower_email}"
            )
            # fail_silently=False để nếu có lỗi SMTP sẽ hiện rõ trên terminal
            send_mail(subject, body, from_email, [record.borrower_email], fail_silently=False)
            print(f"[DEBUG] Sent email to {record.borrower_email}")
        except Exception as e:
            # Không nuốt lỗi nữa, in rõ để debug
            print(f"[DEBUG] Failed to send email (SMTP error): {e}")


class ReturnBookView(APIView):
    """POST: Return a borrowed book by record ID"""
    authentication_classes = []
    permission_classes = []
    
    def post(self, request, pk):
        # ✅ CHANGED: pk is now record ID, not book ID
        try:
            record = BorrowRecord.objects.get(
                pk=pk,
                status__in=['BORROWED', 'OVERDUE']
            )
        except BorrowRecord.DoesNotExist:
            return Response(
                {"message": "Không tìm thấy bản ghi mượn sách này hoặc sách đã được trả."}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        book = record.book
        
        with transaction.atomic():
            # Update record
            record.status = 'RETURNED'
            record.return_date = timezone.now()
            record.save()
            
            # Increase available quantity
            book.available_quantity += 1
            book.save()
            
            print(f"[DEBUG] Book returned successfully. Record ID: {record.id}, Book: {book.title}, New available: {book.available_quantity}")
            
            return Response(
                BorrowRecordSerializer(record).data, 
                status=status.HTTP_200_OK
            )


class ApproveBorrowView(APIView):
    """POST: Approve a pending borrow record (admin action)"""
    authentication_classes = []
    permission_classes = []

    def post(self, request, pk):
        try:
            record = BorrowRecord.objects.select_related('book').get(
                pk=pk,
                status='PENDING'
            )
        except BorrowRecord.DoesNotExist:
            return Response(
                {"message": "Không tìm thấy yêu cầu mượn đang chờ duyệt."},
                status=status.HTTP_400_BAD_REQUEST
            )

        book = record.book

        if book.available_quantity <= 0:
            return Response(
                {"message": "Sách đã hết, không thể duyệt."},
                status=status.HTTP_400_BAD_REQUEST
            )

        with transaction.atomic():
            book.available_quantity -= 1
            book.save()
            record.status = 'BORROWED'
            record.borrow_date = timezone.now()
            record.save()

        # Send email on approval
        try:
            BorrowBookView()._send_borrow_email(record, action="approved")
        except Exception:
            pass

        return Response(BorrowRecordSerializer(record).data, status=status.HTTP_200_OK)


class UserBorrowHistoryView(generics.ListAPIView):
    """GET: List all borrow records"""
    queryset = BorrowRecord.objects.all().select_related('book')
    serializer_class = BorrowRecordSerializer
    authentication_classes = []
    permission_classes = []