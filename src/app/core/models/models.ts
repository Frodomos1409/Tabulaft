export type Category =
  | 'Diseño Gráfico' | 'Ilustración' | 'Fotografía'
  | 'Editorial' | 'Branding' | 'UI/UX' | 'Tipografía' | 'Motion';

export const CATEGORIES: Category[] = [
  'Diseño Gráfico', 'Ilustración', 'Fotografía',
  'Editorial', 'Branding', 'UI/UX', 'Tipografía', 'Motion'
];

export interface User {
  id: string;
  name: string;
  email: string;
  avatar: string;
  role: string;
  bio: string;
  followers: number;
  following: number;
  projectCount: number;
  isAdmin: boolean;
  createdAt: Date;
}

export interface Project {
  id: string;
  title: string;
  description: string | null;
  cover_image?: string | null;
  author_id?: string;
  coverImage?: string;
  images: string[];
  author: any;
  category: string;
  tags: string[];
  likes: number;
  views: number;
  comments?: any[];
  featured: boolean;
  liked?: boolean;
  saved?: boolean;
  status?: string;
  created_at?: string;
  createdAt?: Date;
}

export interface Comment {
  id: string;
  user: User;
  text: string;
  createdAt: Date;
}

export interface Notification {
  id: string;
  text: string;
  avatar?: string;
  read: boolean;
  createdAt: Date;
}

