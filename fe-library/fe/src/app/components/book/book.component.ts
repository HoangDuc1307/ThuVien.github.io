// src/app/components/book/book.component.ts - FIXED
import { Component, OnInit } from "@angular/core";
import { CommonModule } from "@angular/common";
import { Router } from "@angular/router";
import { FormsModule } from "@angular/forms";
import { HeaderComponent } from "../shared/header/header.component";
import { LibraryService, Book } from "../../services/library.service";
import { AuthService } from "../../services/auth.service";

@Component({
  selector: "app-book",
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    HeaderComponent,
  ],
  templateUrl: "./book.component.html",
  styleUrl: "./book.component.css",
})
export class BookComponent implements OnInit {
  searchQuery: string = "";
  books: (Book & { image: string })[] = [];
  filteredBooks: (Book & { image: string })[] = [];
  showBorrowModal = false;
  selectedBook: (Book & { image: string }) | null = null;
  borrowerName = "";
  dueDate = "";
  borrowerEmail = "";
  borrowerId: number | null = null;

  constructor(
    private libraryService: LibraryService,
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.libraryService.books$.subscribe((books) => {
      this.books = books.map((book) => ({
        ...book,
        image: book.image_url || book.image || this.getRandomBookImage(),
      }));
      this.filteredBooks = [...this.books];
    });
  }

  onSearch(): void {
    if (!this.searchQuery.trim()) {
      this.filteredBooks = [...this.books];
      return;
    }

    const query = this.searchQuery.toLowerCase();
    this.filteredBooks = this.books.filter(
      (book) =>
        book.title.toLowerCase().includes(query) ||
        book.author.toLowerCase().includes(query) ||
        book.isbn.toLowerCase().includes(query)
    );
  }

  borrowBook(bookId: number): void {
    const book = this.books.find((b) => b.id === bookId);

    // Nếu sách đã hết, chỉ hiển thị thông báo và không mở modal
    if (!book || book.available_quantity <= 0) {
      alert("Sách đã hết. Vui lòng chọn cuốn sách khác.");
      return;
    }

    const user = this.authService.getCurrentUser();
    if (!user) {
      this.router.navigate(["/login"]);
      return;
    }

    this.borrowerName = user.username;
    this.borrowerEmail = user.email || "";
    this.borrowerId = user.id;
    this.selectedBook = book;
    this.dueDate = this.getDefaultDueDate();
    this.showBorrowModal = true;
  }

  confirmBorrow(): void {
    if (!this.selectedBook) return;
    const isoDue = new Date(this.dueDate).toISOString();
    this.libraryService
      .borrowBook(
        this.selectedBook.id,
        isoDue,
        this.borrowerName,
        false,                   // user request -> PENDING
        this.borrowerEmail,
        this.borrowerId ?? undefined // gửi lên user_id để backend dò email chính xác
      )
      .subscribe({
        next: () => {
          this.showBorrowModal = false;
          this.selectedBook = null;
          this.libraryService.loadBooks();
          this.libraryService.loadBorrowHistory();
          alert("Đặt sách thành công!");
        },
        error: (err) => {
          console.error("Borrow error:", err);
          alert(
            err.error?.message ||
              err.error?.detail ||
              "Không thể đặt sách. Vui lòng thử lại."
          );
        },
      });
  }

  closeModal(): void {
    this.showBorrowModal = false;
    this.selectedBook = null;
  }

  getDefaultDueDate(): string {
    const now = new Date();
    now.setDate(now.getDate() + 1);
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    const hours = String(now.getHours()).padStart(2, "0");
    const minutes = String(now.getMinutes()).padStart(2, "0");
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  }

  private getRandomBookImage(): string {
    const images = [
      "https://images.unsplash.com/photo-1524995997946-a1c2e315a42f",
      "https://images.unsplash.com/photo-1507842217343-583bb7270b66",
      "https://images.unsplash.com/photo-1532012197267-da84d127e765",
      "https://images.unsplash.com/photo-1528207776546-365bb710ee93",
    ];
    return images[Math.floor(Math.random() * images.length)];
  }
}
