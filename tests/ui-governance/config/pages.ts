export interface UITarget {
  app: 'web' | 'admin';
  baseUrl: string;
  routes: string[];
}

export const targets: UITarget[] = [
  {
    app: 'web',
    baseUrl: 'http://localhost:3000',
    routes: [
      '/',
      '/login'
    ]
  },
  {
    app: 'admin',
    baseUrl: 'http://localhost:3002',
    routes: [
      '/scanner',
      '/ticket-management',
      '/login'
    ]
  }
];
