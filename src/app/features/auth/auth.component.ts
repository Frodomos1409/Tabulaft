import { Component, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-auth',
  standalone: true,
  imports: [RouterLink, CommonModule, FormsModule],
  templateUrl: './auth.component.html',
  styleUrl: './auth.component.scss'
})
export class AuthComponent {
  isLogin = signal(true);
  toggle() { this.isLogin.update(v => !v); }

  heroImages = [
    'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=300&q=80',
    'https://images.unsplash.com/photo-1626785774573-4b799315345d?w=300&q=80',
    'https://images.unsplash.com/photo-1561070791-2526d30994b5?w=300&q=80',
    'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=300&q=80',
  ];
}
