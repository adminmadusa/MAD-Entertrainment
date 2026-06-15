import '@testing-library/jest-dom';
import React from 'react';
import { vi, beforeEach } from 'vitest';

// Mock window.scrollTo since JSDOM does not implement it
window.scrollTo = vi.fn();

// Define a fully mockable in-memory localStorage implementation
const mockLocalStorage = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string): string | null => store[key] || null),
    setItem: vi.fn((key: string, value: string): void => {
      store[key] = String(value);
    }),
    removeItem: vi.fn((key: string): void => {
      delete store[key];
    }),
    clear: vi.fn((): void => {
      store = {};
    }),
    key: vi.fn((index: number): string | null => {
      const keys = Object.keys(store);
      return keys[index] || null;
    }),
    get length() {
      return Object.keys(store).length;
    },
  };
})();

// Assign to both globalThis and window
Object.defineProperty(globalThis, 'localStorage', {
  value: mockLocalStorage,
  writable: true,
  configurable: true,
});
if (typeof window !== 'undefined') {
  Object.defineProperty(window, 'localStorage', {
    value: mockLocalStorage,
    writable: true,
    configurable: true,
  });
}

// Mock Next.js navigation
vi.mock('next/navigation', () => ({
  useRouter() {
    return {
      prefetch: vi.fn(),
      push: vi.fn(),
      replace: vi.fn(),
      back: vi.fn(),
    };
  },
  usePathname() {
    return '/';
  },
  useSearchParams() {
    return new URLSearchParams();
  },
}));

// Mock Next.js Link to render as a simple anchor tag in tests
vi.mock('next/link', () => ({
  __esModule: true,
  default: React.forwardRef<HTMLAnchorElement, React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }>(
    ({ children, href, ...props }, ref) => {
      return React.createElement('a', { ...props, href, ref }, children);
    }
  ),
}));

// Mock Google One Tap GSI library globals
const mockGoogleInitialize = vi.fn();
const mockGoogleRenderButton = vi.fn();

Object.defineProperty(window, 'google', {
  value: {
    accounts: {
      id: {
        initialize: mockGoogleInitialize,
        renderButton: mockGoogleRenderButton,
      },
    },
  },
  writable: true,
  configurable: true,
});

// Expose mock functions so test files can inspect or trigger them
const globalMock = globalThis as unknown as {
  mockGoogleInitialize: typeof mockGoogleInitialize;
  mockGoogleRenderButton: typeof mockGoogleRenderButton;
};
globalMock.mockGoogleInitialize = mockGoogleInitialize;
globalMock.mockGoogleRenderButton = mockGoogleRenderButton;

// Clear mocks and localStorage before each test
beforeEach(() => {
  if (typeof window !== 'undefined' && window.localStorage) {
    window.localStorage.clear();
  }
  vi.clearAllMocks();
});
