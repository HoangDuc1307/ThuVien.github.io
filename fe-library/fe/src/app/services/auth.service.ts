import { Injectable } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { Observable, BehaviorSubject, tap } from "rxjs";

export interface LoginRequest {
  username: string;
  password: string;
}

export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
}

export interface AuthResponse {
  access: string;
  refresh: string;
  username: string;
  is_staff: boolean;
  access_token: string;
  id: number;
  email?: string;
}

export interface User {
  id: number;
  username: string;
  email: string;
  is_staff: boolean;
}

@Injectable({
  providedIn: "root",
})
export class AuthService {
  private apiUrl = "/api/users";
  private currentUserSubject = new BehaviorSubject<User | null>(
    this.getUserFromStorage()
  );
  public currentUser$ = this.currentUserSubject.asObservable();

  constructor(private http: HttpClient) {}

  login(credentials: LoginRequest): Observable<AuthResponse> {
    return this.http
      .post<AuthResponse>(`${this.apiUrl}/login/`, credentials)
      .pipe(
        tap((response: AuthResponse) => {
          this.setAuthData(response);
        })
      );
  }

  register(data: RegisterRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/register/`, data).pipe(
      tap((response: AuthResponse) => {
        this.setAuthData(response);
      })
    );
  }

  logout(): void {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    localStorage.removeItem("user");
    this.currentUserSubject.next(null);
  }

  getToken(): string | null {
    return localStorage.getItem("access_token");
  }

  getRefreshToken(): string | null {
    return localStorage.getItem("refresh_token");
  }

  isAuthenticated(): boolean {
    return !!this.getToken();
  }

  getCurrentUser(): User | null {
    return this.currentUserSubject.value;
  }

  private setAuthData(response: AuthResponse): void {
    localStorage.setItem("access_token", response.access);
    localStorage.setItem("refresh_token", response.refresh);
    const user: User = {
      id: response.id,
      username: response.username,
      email: response.email || "",
      is_staff: response.is_staff,
    };
    localStorage.setItem("user", JSON.stringify(user));
    this.currentUserSubject.next(user);
  }

  private getUserFromStorage(): User | null {
    const userStr = localStorage.getItem("user");
    if (userStr) {
      return JSON.parse(userStr);
    }
    return null;
  }

  refreshToken(): Observable<AuthResponse> {
    const refresh = this.getRefreshToken();
    if (!refresh) {
      throw new Error("No refresh token available");
    }
    return this.http.post<AuthResponse>(`${this.apiUrl}/token/refresh/`, {
      refresh,
    });
  }
}
