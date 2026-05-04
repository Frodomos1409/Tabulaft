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
  description: string;
  coverImage: string;
  images: string[];
  author: User;
  category: Category;
  tags: string[];
  likes: number;
  views: number;
  comments: Comment[];
  featured: boolean;
  liked?: boolean;
  saved?: boolean;
  createdAt: Date;
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

// ─── Mock Data ───────────────────────────────────────────────────────────────
export const MOCK_USERS: User[] = [
  { id: '1', name: 'Valentina Ríos', email: 'v@uni.edu', avatar: 'https://i.pravatar.cc/150?img=47', role: 'Diseñadora Gráfica', bio: 'Explorando tipografía y sistemas visuales.', followers: 1240, following: 89, projectCount: 18, isAdmin: false, createdAt: new Date('2023-08-01') },
  { id: '2', name: 'Sebastián Mora', email: 's@uni.edu', avatar: 'https://i.pravatar.cc/150?img=12', role: 'Ilustrador Digital', bio: 'Arte con alma latinoamericana.', followers: 980, following: 120, projectCount: 24, isAdmin: false, createdAt: new Date('2023-06-15') },
  { id: '3', name: 'Camila Vargas', email: 'c@uni.edu', avatar: 'https://i.pravatar.cc/150?img=25', role: 'Fotógrafa', bio: 'La luz como lenguaje.', followers: 2100, following: 45, projectCount: 31, isAdmin: true, createdAt: new Date('2022-11-20') },
  { id: '4', name: 'Julián Ospina', email: 'j@uni.edu', avatar: 'https://i.pravatar.cc/150?img=33', role: 'Motion Designer', bio: 'Movimiento y narrativa visual.', followers: 750, following: 200, projectCount: 12, isAdmin: false, createdAt: new Date('2024-01-10') },
  { id: '5', name: 'Manuela Torres', email: 'm@uni.edu', avatar: 'https://i.pravatar.cc/150?img=56', role: 'UI/UX Designer', bio: 'Experiencias que conectan.', followers: 1560, following: 67, projectCount: 22, isAdmin: false, createdAt: new Date('2023-03-05') },
];

const covers = [
  'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600&q=80',
  'https://images.unsplash.com/photo-1626785774573-4b799315345d?w=600&q=80',
  'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600&q=80',
  'https://images.unsplash.com/photo-1561070791-2526d30994b5?w=600&q=80',
  'https://images.unsplash.com/photo-1634986666676-ec8fd927c23d?w=600&q=80',
  'https://images.unsplash.com/photo-1504868584819-f8e8b4b6d7e3?w=600&q=80',
  'https://images.unsplash.com/photo-1545945774-73922eb27813?w=600&q=80',
  'https://images.unsplash.com/photo-1547658719-da2b51169166?w=600&q=80',
  'https://images.unsplash.com/photo-1609348445457-09e40f29a33d?w=600&q=80',
  'https://images.unsplash.com/photo-1578328819058-b69f3a3b0f6b?w=600&q=80',
  'https://images.unsplash.com/photo-1611532736597-de2d4265fba3?w=600&q=80',
  'https://images.unsplash.com/photo-1572044162444-ad60f128bdea?w=600&q=80',
];

export const MOCK_PROJECTS: Project[] = [
  { id: 'p1', title: 'Identidad Bienal', description: 'Sistema de identidad para la Bienal de Diseño UNIVALLE 2024.', coverImage: covers[0], images: [covers[0]], author: MOCK_USERS[0], category: 'Branding', tags: ['identidad', 'bienal', 'tipografía'], likes: 248, views: 1820, comments: [], featured: true, createdAt: new Date('2024-03-10') },
  { id: 'p2', title: 'Autorepresentación', description: 'Serie de ilustraciones sobre identidad y cultura latinoamericana.', coverImage: covers[1], images: [covers[1]], author: MOCK_USERS[1], category: 'Ilustración', tags: ['ilustración', 'identidad', 'cultura'], likes: 312, views: 2450, comments: [], featured: true, createdAt: new Date('2024-02-20') },
  { id: 'p3', title: 'Paisajes de SC', description: 'Exploración fotográfica del paisaje urbano santacruceño.', coverImage: covers[2], images: [covers[2]], author: MOCK_USERS[2], category: 'Fotografía', tags: ['fotografía', 'urbano', 'colombia'], likes: 195, views: 1100, comments: [], featured: false, createdAt: new Date('2024-01-15') },
  { id: 'p4', title: 'Mural Bienal', description: 'Intervención mural para el campus universitario.', coverImage: covers[3], images: [covers[3]], author: MOCK_USERS[1], category: 'Diseño Gráfico', tags: ['mural', 'intervención', 'campus'], likes: 421, views: 3200, comments: [], featured: true, createdAt: new Date('2024-03-25') },
  { id: 'p5', title: 'Día de la Mujer', description: 'Campaña visual para el 8M con enfoque en activismo gráfico.', coverImage: covers[4], images: [covers[4]], author: MOCK_USERS[4], category: 'Editorial', tags: ['activismo', 'feminismo', 'campaña'], likes: 589, views: 4800, comments: [], featured: true, createdAt: new Date('2024-03-08') },
  { id: 'p6', title: 'Cultura Viva', description: 'Publicación editorial sobre tradiciones artesanales del Valle.', coverImage: covers[5], images: [covers[5]], author: MOCK_USERS[0], category: 'Editorial', tags: ['editorial', 'cultura', 'artesanía'], likes: 167, views: 890, comments: [], featured: false, createdAt: new Date('2024-02-05') },
  { id: 'p7', title: 'Motion Reel 2024', description: 'Compilación de piezas de motion design del año.', coverImage: covers[6], images: [covers[6]], author: MOCK_USERS[3], category: 'Motion', tags: ['motion', 'animación', 'reel'], likes: 734, views: 5600, comments: [], featured: true, createdAt: new Date('2024-04-01') },
  { id: 'p8', title: 'Tipografías Locales', description: 'Diseño tipográfico inspirado en letreros artesanales colombianos.', coverImage: covers[7], images: [covers[7]], author: MOCK_USERS[0], category: 'Tipografía', tags: ['tipografía', 'lettering', 'colombia'], likes: 280, views: 1900, comments: [], featured: false, createdAt: new Date('2024-01-28') },
  { id: 'p9', title: 'App Univalle', description: 'Rediseño de la aplicación móvil universitaria centrado en UX.', coverImage: covers[8], images: [covers[8]], author: MOCK_USERS[4], category: 'UI/UX', tags: ['ui', 'ux', 'app', 'mobile'], likes: 445, views: 3100, comments: [], featured: false, createdAt: new Date('2024-03-18') },
  { id: 'p10', title: 'Publicidad Switch', description: 'Campaña publicitaria para marca de óptica independiente.', coverImage: covers[9], images: [covers[9]], author: MOCK_USERS[1], category: 'Diseño Gráfico', tags: ['publicidad', 'campaña', 'óptica'], likes: 198, views: 1350, comments: [], featured: false, createdAt: new Date('2024-02-14') },
  { id: 'p11', title: 'Retrato Urbano', description: 'Serie de retratos documentales en el centro histórico.', coverImage: covers[10], images: [covers[10]], author: MOCK_USERS[2], category: 'Fotografía', tags: ['retrato', 'documental', 'urbano'], likes: 367, views: 2700, comments: [], featured: true, createdAt: new Date('2024-04-05') },
  { id: 'p12', title: 'Una Región No Se Mastica', description: 'Póster de denuncia social sobre apropiación cultural.', coverImage: covers[11], images: [covers[11]], author: MOCK_USERS[3], category: 'Diseño Gráfico', tags: ['poster', 'denuncia', 'social'], likes: 612, views: 4200, comments: [], featured: true, createdAt: new Date('2024-03-30') },
];
