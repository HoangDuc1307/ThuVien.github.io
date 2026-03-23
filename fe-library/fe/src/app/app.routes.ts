import { Routes } from '@angular/router';
import { adminGuard } from './guards/admin.guard';

export const routes: Routes = [
  {
    path: '',
    redirectTo: '/home',
    pathMatch: 'full'
  },
  {
    path: 'home',
    loadComponent: () => import('./components/home/home.component').then(m => m.HomeComponent)
  },
  {
    path: 'books',
    loadComponent: () => import('./components/book/book.component').then(m => m.BookComponent)
  },
  {
    path: 'login',
    loadComponent: () => import('./components/login/login.component').then(m => m.LoginComponent)
  },
  {
    path: 'register',
    loadComponent: () => import('./components/register/register.component').then(m => m.RegisterComponent)
  },
  {
    path: 'management',
    loadComponent: () => import('./components/management/management.component').then(m => m.ManagementComponent),
    canActivate: [adminGuard]
  },
  {
    path: 'user-management',
    loadComponent: () => import('./components/user_management/user_management.component').then(m => m.UserManagementComponent)
  }
];

