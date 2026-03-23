// src/app/components/management/management.component.ts - FIXED
import { Component, OnInit } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { HttpClient, HttpClientModule } from "@angular/common/http";
import { Router } from "@angular/router";
import {
  LibraryService,
  Book,
  BorrowRecord,
} from "../../services/library.service";
import { AuthService } from "../../services/auth.service";

interface Member {
  id: number;
  name: string;
  email: string;
}

@Component({
  selector: "app-management",
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule],
  templateUrl: "./management.component.html",
  styleUrl: "./management.component.css",
})
export class ManagementComponent implements OnInit {
  activePage: "books" | "loans" | "members" = "books";
  activeLoanTab: "loan" | "return" | "report" = "loan";

  books: Book[] = [];
  borrowHistory: BorrowRecord[] = [];
  members: Member[] = [];
  membersLoading = false;

  // Book form
  editingBookId: number | null = null;
  bookForm = {
    title: "",
    author: "",
    isbn: "",
    total_quantity: 1,
  };
  selectedImageFile: File | null = null;
  imagePreview: string | null = null;

  // Return form
  returnForm = {
    bookId: 0,
  };

  // ✅ ADD: Separate variable for borrow book ID
  selectedBookId: number = 0;
  selectedDueDate: string = "";
  borrowerName: string = "";
  borrowerEmail: string = "";
  selectedMemberId: number | null = null;
  private readonly userServiceUrl = "http://localhost:8000/users/";

  constructor(
    private libraryService: LibraryService,
    private router: Router,
    private http: HttpClient,
    private authService: AuthService
  ) {
    // Set default due date to 1 day from now
    this.setDefaultDueDate();
  }

  // ✅ ADD: Set default due date (1 day from now)
  setDefaultDueDate(): void {
    const now = new Date();
    now.setDate(now.getDate() + 1);
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    this.selectedDueDate = `${year}-${month}-${day}T${hours}:${minutes}`;
  }

  showBookModal = false;
  showBookReportModal = false;
  loading = false;
  error: string = "";


  ngOnInit(): void {
    this.libraryService.books$.subscribe((books) => (this.books = books));
    this.libraryService.borrowHistory$.subscribe(
      (history) => (this.borrowHistory = history)
    );
    this.libraryService.loadBorrowHistory();
    this.loadMembers();
  }

  switchPage(page: "books" | "loans" | "members"): void {
    this.activePage = page;
    if (page === "loans") {
      this.libraryService.loadBorrowHistory();
    }
  }

  switchLoanTab(tab: "loan" | "return" | "report"): void {
    this.activeLoanTab = tab;
  }

  // Book methods
  openBookModal(): void {
    this.editingBookId = null;
    this.bookForm = {
      title: "",
      author: "",
      isbn: "",
      total_quantity: 1,
    };
    this.selectedImageFile = null;
    this.imagePreview = null;
    this.showBookModal = true;
    this.error = "";
  }

  closeBookModal(): void {
    this.showBookModal = false;
    this.selectedImageFile = null;
    this.imagePreview = null;
  }

  editBook(book: Book): void {
    this.editingBookId = book.id;
    this.bookForm = {
      title: book.title,
      author: book.author,
      isbn: book.isbn,
      total_quantity: book.total_quantity,
    };
    this.selectedImageFile = null;
    this.imagePreview = book.image_url || book.image || null;
    this.showBookModal = true;
    this.error = "";
  }

  saveBook(): void {
    if (!this.bookForm.title || !this.bookForm.author || !this.bookForm.isbn) {
      this.error = "Vui lòng điền đầy đủ thông tin";
      return;
    }

    this.loading = true;
    this.error = "";

    const operation = this.editingBookId
      ? this.libraryService.updateBook(this.editingBookId, this.bookForm, this.selectedImageFile || undefined)
      : this.libraryService.addBook(this.bookForm, this.selectedImageFile || undefined);

    operation.subscribe({
      next: () => {
        this.loading = false;
        this.closeBookModal();
        this.selectedImageFile = null;
        this.imagePreview = null;
      },
      error: (err: any) => {
        this.loading = false;
        this.error =
          err.error?.message ||
          err.error?.detail ||
          "Có lỗi xảy ra. Vui lòng thử lại.";
        console.error("Save book error:", err);
      },
    });
  }

  onImageSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.selectedImageFile = input.files[0];
      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        this.imagePreview = e.target?.result as string;
      };
      reader.readAsDataURL(this.selectedImageFile);
    }
  }

  removeImage(): void {
    this.selectedImageFile = null;
    this.imagePreview = null;
  }

  deleteBook(id: number): void {
    if (confirm("Bạn có chắc chắn muốn xóa cuốn sách này?")) {
      this.loading = true;
      this.libraryService.deleteBook(id).subscribe({
        next: () => {
          this.loading = false;
        },
        error: (err: any) => {
          this.loading = false;
          alert(
            "Không thể xóa sách: " + (err.error?.message || "Có lỗi xảy ra")
          );
          console.error("Delete book error:", err);
        },
      });
    }
  }

  // Borrow methods
  onMemberSelect(memberId: number | string | null): void {
    const id = Number(memberId);
    if (!id || isNaN(id)) {
      this.selectedMemberId = null;
      return;
    }
    this.selectedMemberId = id;
    const member = this.members.find((m) => m.id === id);
    if (member) {
      this.borrowerName = member.name || this.borrowerName;
      this.borrowerEmail = member.email || this.borrowerEmail;
    }
  }

  getAvailableBooks(): Book[] {
    return this.books.filter((b) => b.available_quantity > 0);
  }

  getActiveBorrows(): BorrowRecord[] {
    return this.borrowHistory.filter(
      (b) => b.status === "BORROWED" || b.status === "OVERDUE" || b.status === "PENDING"
    );
  }

  // ✅ FIXED: Borrow book function
  borrowBook(bookId: number | string): void {
    console.log("🔍 [ManagementComponent] Borrow clicked, bookId:", bookId);
    console.log("🔍 [ManagementComponent] Book ID type:", typeof bookId);

    // Convert to number if string
    const id = Number(bookId);
    console.log("🔍 [ManagementComponent] Converted ID:", id);

    // Validate bookId
    if (!id || id === 0 || isNaN(id)) {
      console.error("❌ [ManagementComponent] Invalid book ID:", bookId);
      alert("Vui lòng chọn sách");
      return;
    }

    // BẮT BUỘC: phải chọn thành viên để có user_id và email
    if (!this.selectedMemberId) {
      alert("Vui lòng chọn thành viên mượn sách ở mục 'Chọn thành viên'.");
      return;
    }

    const member = this.members.find((m) => m.id === this.selectedMemberId);
    if (!member) {
      alert("Không tìm thấy thông tin thành viên. Vui lòng tải lại danh sách thành viên.");
      return;
    }

    // Tự động điền tên và email từ user service
    this.borrowerName = member.name;
    this.borrowerEmail = member.email;

    // Validate due date
    if (!this.selectedDueDate) {
      alert("Vui lòng chọn ngày trả sách");
      return;
    }

    // Convert datetime-local to ISO string for backend
    const dueDate = new Date(this.selectedDueDate).toISOString();

    this.loading = true;
    console.log(
      "🔍 [ManagementComponent] Calling libraryService.borrowBook with ID:",
      id,
      "Due Date:",
      dueDate,
      "Borrower:",
      this.borrowerName
    );

    const trimmedEmail = this.borrowerEmail?.trim() || undefined;
    const userId = this.selectedMemberId || undefined;

    this.libraryService
      .borrowBook(
        id,
        dueDate,
        this.borrowerName.trim(),
        true,
        trimmedEmail,
        userId
      )
      .subscribe({
      next: (record) => {
        this.loading = false;
        console.log("✅ [ManagementComponent] Borrow successful:", record);
        alert("Mượn sách thành công! 📚");
        // Reset form
        this.selectedBookId = 0;
        this.borrowerName = "";
        this.borrowerEmail = "";
        this.selectedMemberId = null;
        this.setDefaultDueDate(); // Reset to default (1 day from now)
        // Reload books to update available quantity
        this.libraryService.loadBooks();
        this.libraryService.loadBorrowHistory();
      },
      error: (err: any) => {
        this.loading = false;
        console.error("❌ [ManagementComponent] Borrow error:", err);
        const errorMsg =
          err.error?.message || err.error?.detail || "Không thể mượn sách. Vui lòng thử lại.";
        alert(errorMsg);
      },
    });
  }

  // ✅ ADD: Helper function for debugging
  onBookSelect(): void {
    console.log(
      "📚 Book selected:",
      this.selectedBookId,
      typeof this.selectedBookId
    );
  }

  // ✅ ADD: Get minimum date for datetime input (today)
  getMinDate(): string {
    const now = new Date();
    // Format: YYYY-MM-DDTHH:mm
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  }

  returnBook(recordId: number): void {
    console.log("🔍 [ManagementComponent] Return clicked, recordId:", recordId);

    if (!recordId || recordId === 0) {
      alert("Vui lòng chọn sách để trả");
      return;
    }

    this.loading = true;
    this.libraryService.returnBook(recordId).subscribe({
      next: () => {
        this.loading = false;
        console.log("✅ [ManagementComponent] Return successful");
        alert("Trả sách thành công! ✅");
        // Reset form
        this.returnForm.bookId = 0;
      },
      error: (err: any) => {
        this.loading = false;
        console.error("❌ [ManagementComponent] Return error:", err);
        alert("Không thể trả sách: " + (err.error?.message || "Có lỗi xảy ra"));
      },
    });
  }

  getBookTitle(bookId: number): string {
    return this.books.find((b) => b.id === bookId)?.title || "N/A";
  }

  // Report methods
  openBookReport(): void {
    this.showBookReportModal = true;
  }

  closeBookReport(): void {
    this.showBookReportModal = false;
  }

  getTotalBooks(): number {
    return this.books.reduce((sum, book) => sum + book.total_quantity, 0);
  }

  getTotalAvailable(): number {
    return this.books.reduce((sum, book) => sum + book.available_quantity, 0);
  }

  getTotalLoaned(): number {
    return this.getTotalBooks() - this.getTotalAvailable();
  }

  getActiveLoansCount(): number {
    return this.getActiveBorrows().length;
  }

  getOverdueLoansCount(): number {
    return this.borrowHistory.filter((l) => l.status === "OVERDUE").length;
  }

  getReturnedLoansCount(): number {
    return this.borrowHistory.filter((l) => l.status === "RETURNED").length;
  }

  approveBorrow(recordId: number): void {
    if (!recordId) return;
    this.loading = true;
    this.libraryService.approveBorrow(recordId).subscribe({
      next: () => {
        this.loading = false;
        alert("Đã duyệt mượn sách.");
      },
      error: (err) => {
        this.loading = false;
        console.error("Approve error:", err);
        alert(
          err.error?.message ||
            err.error?.detail ||
            "Không thể duyệt mượn sách. Vui lòng thử lại."
        );
      },
    });
  }

  // Members
  editMember(member: Member): void {
    console.log("Edit member", member);
  }

  deleteMember(memberId: number): void {
    console.log("Delete member", memberId);
  }

  loadMembers(): void {
    this.membersLoading = true;
    this.http.get<Member[]>(this.userServiceUrl).subscribe({
      next: (res) => {
        // Ensure name fallback if backend changes the field
        this.members = res.map((m: any) => ({
          id: m.id,
          name: m.name || m.username || "",
          email: m.email || "",
        }));
        this.membersLoading = false;
      },
      error: (err) => {
        console.error("Failed to load members", err);
        this.membersLoading = false;
      },
    });
  }

  navigateToHome(): void {
    this.router.navigate(['/home']);
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
