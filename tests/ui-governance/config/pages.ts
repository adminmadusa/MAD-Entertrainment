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
      '/auth/login',
      '/auth/register'
    ]
  },
  {
    app: 'admin',
    baseUrl: 'http://localhost:3002',
    routes: [
      '/scanner',
      '/ticket-management',
      '/auth/login'
    ]
  }
];
