import { Component, OnDestroy, OnInit } from "@angular/core";
import { CommonModule, DatePipe } from "@angular/common";
import { Router } from "@angular/router";
import { Subscription } from "rxjs";
import { LibraryService, BorrowRecord } from "../../services/library.service";
import { AuthService, User } from "../../services/auth.service";
import { HeaderComponent } from "../shared/header/header.component";
@Component({
  selector: "app-user-management",
  standalone: true,
  imports: [CommonModule, DatePipe, HeaderComponent],
  templateUrl: "./user_management.component.html",
  styleUrl: "./user_management.component.css",
})
export class UserManagementComponent implements OnInit, OnDestroy {
  currentUser: User | null = null;
  allHistory: BorrowRecord[] = [];
  myBorrows: BorrowRecord[] = [];
  loading = false;

  private sub?: Subscription;

  constructor(
    private libraryService: LibraryService,
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.currentUser = this.authService.getCurrentUser();
    if (!this.currentUser) {
      // Nếu chưa đăng nhập, điều hướng tới login
      this.router.navigate(["/login"]);
      return;
    }

    this.loading = true;
    this.sub = this.libraryService.borrowHistory$.subscribe((history) => {
      this.allHistory = history;
      this.myBorrows = this.filterMyBorrows(history);
      this.loading = false;
    });
    this.libraryService.loadBorrowHistory();
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }

  private filterMyBorrows(history: BorrowRecord[]): BorrowRecord[] {
    if (!this.currentUser) return [];
    const username = this.currentUser.username;
    return history.filter(
      (r) =>
        r.borrower_name === username ||
        (`User ID: ${r.user_id}` === username) || // fallback if naming stored as "User ID: X"
        r.user_id === Number(username)
    );
  }

  navigateHome(): void {
    this.router.navigate(["/home"]);
  }
}


