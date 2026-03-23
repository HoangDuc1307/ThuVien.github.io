// src/app/services/library.service.ts - FIXED
import { Injectable } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { BehaviorSubject, Observable, tap, catchError, throwError } from "rxjs";

export interface Book {
  id: number;
  title: string;
  author: string;
  isbn: string;
  total_quantity: number;
  available_quantity: number;
  image?: string | null;
  image_url?: string | null;
}

export interface BorrowRecord {
  id: number;
  book: number;
  book_title: string;
  user_id: number | null;
  borrower_name?: string | null;
  borrower_email?: string | null;
  borrow_date: string;
  due_date: string;
  return_date?: string;
  status: "PENDING" | "BORROWED" | "RETURNED" | "OVERDUE";
  days_remaining?: number;
  is_overdue?: boolean;
}

@Injectable({
  providedIn: "root",
})
export class LibraryService {
  // ✅ FIXED: Remove duplicate /books
  private apiUrl = "/api/books";

  private booksSubject = new BehaviorSubject<Book[]>([]);
  private borrowHistorySubject = new BehaviorSubject<BorrowRecord[]>([]);

  books$: Observable<Book[]> = this.booksSubject.asObservable();
  borrowHistory$: Observable<BorrowRecord[]> =
    this.borrowHistorySubject.asObservable();

  constructor(private http: HttpClient) {
    this.loadBooks();
  }

  // Books API
  loadBooks(): void {
    console.log("🔍 Loading books from:", `${this.apiUrl}/books/`);
    this.http.get<Book[]>(`${this.apiUrl}/books/`).subscribe({
      next: (books: Book[]) => {
        console.log("✅ Books loaded:", books);
        this.booksSubject.next(books);
      },
      error: (err: any) => {
        console.error("❌ Error loading books:", err);
      },
    });
  }

  getBooks(): Observable<Book[]> {
    return this.http.get<Book[]>(`${this.apiUrl}/books/`).pipe(
      tap((books: Book[]) => {
        console.log("✅ Books fetched:", books.length);
        this.booksSubject.next(books);
      }),
      catchError((err) => {
        console.error("❌ Error fetching books:", err);
        return throwError(() => err);
      })
    );
  }

  getBook(id: number): Observable<Book> {
    return this.http.get<Book>(`${this.apiUrl}/books/${id}/`);
  }

  addBook(book: Omit<Book, "id" | "available_quantity">, imageFile?: File): Observable<Book> {
    const formData = new FormData();
    formData.append('title', book.title);
    formData.append('author', book.author);
    formData.append('isbn', book.isbn);
    formData.append('total_quantity', book.total_quantity.toString());
    
    if (imageFile) {
      formData.append('image', imageFile);
    }

    return this.http.post<Book>(`${this.apiUrl}/books/`, formData).pipe(
      tap(() => {
        console.log("✅ Book added");
        this.loadBooks();
      })
    );
  }

  updateBook(id: number, book: Partial<Book>, imageFile?: File): Observable<Book> {
    const formData = new FormData();
    
    if (book.title) formData.append('title', book.title);
    if (book.author) formData.append('author', book.author);
    if (book.isbn) formData.append('isbn', book.isbn);
    if (book.total_quantity !== undefined) {
      formData.append('total_quantity', book.total_quantity.toString());
    }
    
    if (imageFile) {
      formData.append('image', imageFile);
    }

    return this.http.put<Book>(`${this.apiUrl}/books/${id}/`, formData).pipe(
      tap(() => {
        console.log("✅ Book updated");
        this.loadBooks();
      })
    );
  }

  deleteBook(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/books/${id}/`).pipe(
      tap(() => {
        console.log("✅ Book deleted");
        this.loadBooks();
      })
    );
  }

  // Borrow API
  borrowBook(
    bookId: number,
    dueDate?: string,
    borrowerName?: string,
    isAdmin?: boolean,
    borrowerEmail?: string,
    userId?: number
  ): Observable<BorrowRecord> {
    console.log("🔍 [LibraryService] Borrowing book ID:", bookId);
    console.log("🔍 [LibraryService] Due Date:", dueDate);
    console.log("🔍 [LibraryService] Borrower Name:", borrowerName);
    console.log("🔍 [LibraryService] isAdmin:", isAdmin);
    console.log("🔍 [LibraryService] borrowerEmail:", borrowerEmail);
    console.log(
      "🔍 [LibraryService] API URL:",
      `${this.apiUrl}/books/borrow/${bookId}/`
    );

    const requestBody: any = {};
    if (dueDate) {
      requestBody.due_date = dueDate;
    }
    if (borrowerName) {
      requestBody.borrower_name = borrowerName;
    }
    if (borrowerEmail) {
      requestBody.borrower_email = borrowerEmail;
    }
    if (userId) {
      requestBody.user_id = userId;
    }
    if (isAdmin !== undefined) {
      requestBody.is_admin = isAdmin;
    }

    return this.http
      .post<BorrowRecord>(`${this.apiUrl}/books/borrow/${bookId}/`, requestBody)
      .pipe(
        tap((record) => {
          console.log(
            "✅ [LibraryService] Book borrowed successfully:",
            record
          );
          this.loadBooks();
          this.loadBorrowHistory();
        }),
        catchError((err) => {
          console.error("❌ [LibraryService] Error borrowing book:", err);
          console.error("❌ [LibraryService] Error details:", err.error);
          return throwError(() => err);
        })
      );
  }

  approveBorrow(recordId: number): Observable<BorrowRecord> {
    console.log("🔍 Approving borrow record:", recordId);
    return this.http
      .post<BorrowRecord>(`${this.apiUrl}/books/approve/${recordId}/`, {})
      .pipe(
        tap((record) => {
          console.log("✅ Borrow approved:", record);
          this.loadBooks();
          this.loadBorrowHistory();
        }),
        catchError((err) => {
          console.error("❌ Error approving borrow:", err);
          return throwError(() => err);
        })
      );
  }

  returnBook(recordId: number): Observable<BorrowRecord> {
    console.log("🔍 Returning book record:", recordId);
    return this.http
      .post<BorrowRecord>(`${this.apiUrl}/books/return/${recordId}/`, {})
      .pipe(
        tap(() => {
          console.log("✅ Book returned");
          this.loadBooks();
          this.loadBorrowHistory();
        }),
        catchError((err) => {
          console.error("❌ Error returning book:", err);
          return throwError(() => err);
        })
      );
  }

  loadBorrowHistory(): void {
    console.log(
      "🔍 Loading borrow history from:",
      `${this.apiUrl}/books/history/`
    );
    this.http.get<BorrowRecord[]>(`${this.apiUrl}/books/history/`).subscribe({
      next: (history: BorrowRecord[]) => {
        console.log("✅ Borrow history loaded:", history);
        this.borrowHistorySubject.next(history);
      },
      error: (err: any) => {
        console.error("❌ Error loading borrow history:", err);
      },
    });
  }

  getBorrowHistory(): Observable<BorrowRecord[]> {
    return this.http.get<BorrowRecord[]>(`${this.apiUrl}/books/history/`).pipe(
      tap((history: BorrowRecord[]) => {
        console.log("✅ Borrow history fetched:", history.length);
        this.borrowHistorySubject.next(history);
      }),
      catchError((err) => {
        console.error("❌ Error fetching borrow history:", err);
        return throwError(() => err);
      })
    );
  }
}
