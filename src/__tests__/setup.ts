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

import VerificationModal from '../components/VerificationModal';
import UserDetailDrawer from '../components/users/UserDetailDrawer';
import JobPreviewModal from '../components/users/JobPreviewModal';
import JobDetailModal from '../components/jobs/JobDetailModal';
import SuspensionModal from '../components/users/SuspensionModal';

vi.mock('next/dynamic', () => {
  return {
    default: (loader: any) => {
      const str = loader.toString();
      if (str.includes('VerificationModal')) {
        return VerificationModal;
      }
      if (str.includes('UserDetailDrawer')) {
        return UserDetailDrawer;
      }
      if (str.includes('JobPreviewModal')) {
        return JobPreviewModal;
      }
      if (str.includes('JobDetailModal')) {
        return JobDetailModal;
      }
      if (str.includes('SuspensionModal')) {
        return SuspensionModal;
      }
      return () => null;
    },
  };
});
