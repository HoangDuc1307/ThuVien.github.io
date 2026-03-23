import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { HeaderComponent } from '../shared/header/header.component';
import { FooterComponent } from '../shared/footer/footer.component';
import { LibraryService, Book } from '../../services/library.service';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule, HeaderComponent, FooterComponent],
  templateUrl: './home.component.html',
  styleUrl: './home.component.css'
})
export class HomeComponent implements OnInit {
  searchQuery: string = '';
  books: (Book & { imageSrc: string })[] = [];
  filteredBooks: (Book & { imageSrc: string })[] = [];

  private placeholders = [
    'https://images.unsplash.com/photo-1524995997946-a1c2e315a42f',
    'https://images.unsplash.com/photo-1507842217343-583bb7270b66',
    'https://images.unsplash.com/photo-1532012197267-da84d127e765',
    'https://images.unsplash.com/photo-1528207776546-365bb710ee93',
  ];

  constructor(private libraryService: LibraryService) {}

  ngOnInit(): void {
    this.libraryService.books$.subscribe((books) => {
      this.books = books.map((b) => ({
        ...b,
        imageSrc: b.image_url || b.image || this.getRandomPlaceholder(),
      }));
      this.filteredBooks = [...this.books];
    });
    this.libraryService.loadBooks();
    this.setupScrollEffects();
  }

  onSearch(): void {
    if (!this.searchQuery.trim()) {
      this.filteredBooks = [...this.books];
      return;
    }

    const query = this.searchQuery.toLowerCase();
    this.filteredBooks = this.books.filter(book =>
      book.title.toLowerCase().includes(query) ||
      book.author.toLowerCase().includes(query) ||
      book.isbn.toLowerCase().includes(query)
    );
  }

  private getRandomPlaceholder(): string {
    const idx = Math.floor(Math.random() * this.placeholders.length);
    return `${this.placeholders[idx]}?auto=format&fit=crop&w=800&q=80`;
  }

  private setupScrollEffects(): void {
    // Back to top button
    const backToTop = document.createElement('button');
    backToTop.id = 'backToTopBtn';
    backToTop.textContent = '▲';
    backToTop.style.cssText = `
      position: fixed;
      bottom: 24px;
      right: 24px;
      padding: 10px 14px;
      font-size: 18px;
      border-radius: 50%;
      border: none;
      cursor: pointer;
      background: #2563eb;
      color: #fff;
      display: none;
      box-shadow: 0 6px 16px rgba(0,0,0,0.2);
      z-index: 1000;
    `;
    document.body.appendChild(backToTop);

    window.addEventListener('scroll', () => {
      if (window.scrollY > 250) {
        backToTop.style.display = 'block';
      } else {
        backToTop.style.display = 'none';
      }
    });

    backToTop.addEventListener('click', () => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }
}

