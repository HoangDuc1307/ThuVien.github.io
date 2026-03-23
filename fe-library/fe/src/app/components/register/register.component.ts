import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  templateUrl: './register.component.html',
  styleUrl: './register.component.css'
})
export class RegisterComponent {
  username: string = '';
  email: string = '';
  password: string = '';
  confirmPassword: string = '';
  error: string = '';
  success: string = '';
  loading: boolean = false;

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  onSubmit(): void {
    if (!this.username || !this.email || !this.password) {
      this.error = 'Vui lòng nhập đầy đủ thông tin';
      return;
    }

    if (this.password !== this.confirmPassword) {
      this.error = 'Mật khẩu xác nhận không khớp';
      return;
    }

    if (this.password.length < 6) {
      this.error = 'Mật khẩu phải có ít nhất 6 ký tự';
      return;
    }

    this.loading = true;
    this.error = '';
    this.success = '';

    this.authService.register({
      username: this.username,
      email: this.email,
      password: this.password
    }).subscribe({
      next: () => {
        this.loading = false;
        this.success = 'Đăng ký thành công! Tự động đăng nhập...';
        setTimeout(() => {
          this.router.navigate(['/home']);
        }, 1200);
      },
      error: (err) => {
        this.loading = false;
        this.error =
          err.error?.username?.[0] ||
          err.error?.email?.[0] ||
          err.error?.password?.[0] ||
          err.error?.message ||
          'Đăng ký thất bại. Vui lòng thử lại.';
        console.error('Register error:', err);
      }
    });
  }
}

