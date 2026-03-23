import { inject } from "@angular/core";
import { CanActivateFn, Router } from "@angular/router";
import { AuthService } from "../services/auth.service";

export const adminGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  const user = authService.getCurrentUser();

  if (user && user.is_staff) {
    return true;
  }

  // Not admin: redirect to home (or login if not authenticated)
  if (!authService.isAuthenticated()) {
    router.navigate(["/login"]);
  } else {
    router.navigate(["/home"]);
  }
  return false;
};


