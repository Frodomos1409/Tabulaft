import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { NavbarComponent } from '../../shared/components/navbar/navbar.component';
import { ProjectCardComponent } from '../../shared/components/project-card/project-card.component';
import { MOCK_PROJECTS, MOCK_USERS } from '../../core/models/models';

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [RouterLink, CommonModule, NavbarComponent, ProjectCardComponent],
  templateUrl: './landing.component.html',
  styleUrl: './landing.component.scss'
})
export class LandingComponent {
  featuredProjects = MOCK_PROJECTS.filter(p => p.featured).slice(0, 6);
  featuredCreators = MOCK_USERS.slice(0, 3);

  categories = [
    { name: 'Diseño Gráfico', icon: '✦', count: 312 },
    { name: 'Ilustración',    icon: '◈', count: 248 },
    { name: 'Fotografía',     icon: '⬡', count: 189 },
    { name: 'Editorial',      icon: '▣', count: 97  },
    { name: 'Branding',       icon: '◉', count: 143 },
    { name: 'UI/UX',          icon: '⬢', count: 201 },
    { name: 'Tipografía',     icon: '◈', count: 76  },
    { name: 'Motion',         icon: '▷', count: 118 },
  ];

  stats = [
    { value: '2,400+', label: 'Proyectos' },
    { value: '580+',   label: 'Diseñadores' },
    { value: '15K',    label: 'Visitas mensuales' },
    { value: '8',      label: 'Categorías' },
  ];

  heroImages = [
    'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=400&q=80',
    'https://images.unsplash.com/photo-1626785774573-4b799315345d?w=400&q=80',
    'https://images.unsplash.com/photo-1561070791-2526d30994b5?w=400&q=80',
    'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&q=80',
  ];
}
