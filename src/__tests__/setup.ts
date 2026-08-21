import '@testing-library/jest-dom';
import { vi } from 'vitest';

vi.mock('next/navigation', () => {
  const get = vi.fn().mockReturnValue('');
  return {
    useSearchParams: () => ({
      get,
    }),
    usePathname: () => '/dashboard',
    useRouter: () => ({
      push: vi.fn(),
      replace: vi.fn(),
      prefetch: vi.fn(),
    }),
  };
});
