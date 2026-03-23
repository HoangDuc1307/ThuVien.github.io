import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css'
})
export class LoginComponent {
  username: string = '';
  password: string = '';
  error: string = '';
  loading: boolean = false;

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  onSubmit(): void {
    if (!this.username || !this.password) {
      this.error = 'Vui lòng nhập đầy đủ thông tin';
      return;
    }

    this.loading = true;
    this.error = '';

    this.authService.login({ username: this.username, password: this.password }).subscribe({
      next: (res) => {
        this.loading = false;
        // Nếu là admin => vào thẳng trang quản lý
        if (res.is_staff) {
          this.router.navigate(['/management']);
        } else {
          this.router.navigate(['/home']);
        }
      },
      error: (err) => {
        this.loading = false;
        this.error = err.error?.detail || err.error?.message || 'Đăng nhập thất bại. Vui lòng thử lại.';
        console.error('Login error:', err);
      }
    });
  }
}

