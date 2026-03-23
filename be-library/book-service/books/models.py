# be/book-service/books/models.py - FIXED

from django.db import models
from django.utils import timezone
from datetime import timedelta

def get_default_due_date():
    """Return due date 2 weeks from now"""
    return timezone.now() + timedelta(weeks=2)

class Book(models.Model):
    title = models.CharField(max_length=255)
    author = models.CharField(max_length=255)
    isbn = models.CharField(max_length=20, unique=True)
    total_quantity = models.IntegerField(default=1) 
    available_quantity = models.IntegerField(default=1)
    image = models.ImageField(upload_to='books/', null=True, blank=True)
    
    
    class Meta:
        ordering = ['title']

    def __str__(self):
        return f"{self.title} by {self.author}"
    
    def save(self, *args, **kwargs):
        # Set available_quantity when creating new book
        if self._state.adding:
            self.available_quantity = self.total_quantity
        super().save(*args, **kwargs)


class BorrowRecord(models.Model):
    # user_id is the ID from User Service (using IntegerField for microservices)
    user_id = models.IntegerField(db_index=True, null=True, blank=True)  # Optional for librarian use
    # ✅ ADD: Borrower name for librarian to enter
    borrower_name = models.CharField(max_length=255, null=True, blank=True)
    borrower_email = models.EmailField(null=True, blank=True)
    
    book = models.ForeignKey(Book, on_delete=models.CASCADE, related_name='records')
    borrow_date = models.DateTimeField(default=timezone.now)
    due_date = models.DateTimeField(default=get_default_due_date)  # ✅ Fixed: Use function
    return_date = models.DateTimeField(null=True, blank=True)
    
    STATUS_CHOICES = [
        ('PENDING', 'Pending'),
        ('BORROWED', 'Borrowed'),
        ('RETURNED', 'Returned'),
        ('OVERDUE', 'Overdue'),
    ]
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='PENDING')

    def __str__(self):
        borrower = self.borrower_name or f"User {self.user_id}"
        return f"{borrower} borrowed {self.book.title} ({self.status})"

    class Meta:
        # ✅ Fixed: Only prevent duplicate active borrows, not all history
        # Constraint based on borrower_name (for librarian use)
        constraints = [
            models.UniqueConstraint(
                fields=['borrower_name', 'book'],
                condition=models.Q(status='BORROWED'),
                name='unique_active_borrow'
            )
        ]
        ordering = ['-borrow_date']
        
    def save(self, *args, **kwargs):
        # Auto-update status to OVERDUE if past due date
        if self.status == 'BORROWED' and self.due_date < timezone.now():
            self.status = 'OVERDUE'
        super().save(*args, **kwargs)