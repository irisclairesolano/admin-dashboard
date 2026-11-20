import React from 'react';
import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import UserGrowthChart from '@/components/dashboard/UserGrowthChart';
import GeographicActivityChart from '@/components/dashboard/GeographicActivityChart';
import ApplicationVolumeChart from '@/components/dashboard/ApplicationVolumeChart';
import ConversionVelocityChart from '@/components/dashboard/ConversionVelocityChart';
import JobsDistributionChart from '@/components/dashboard/JobsDistributionChart';
import SkillDistributionPieChart from '@/components/dashboard/SkillDistributionPieChart';
import {
  getAdaptiveBarConfig,
  formatAxisTick,
  formatPeriodLabel,
  truncateLabel,
} from '@/components/dashboard/chartTheme';

const originalMatchMedia = window.matchMedia;

beforeAll(() => {
  // Enable reduced-motion so Recharts renders final bar rectangles immediately in jsdom
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: query === '(prefers-reduced-motion: reduce)',
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
});

afterAll(() => {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: originalMatchMedia,
  });
});

// Mock ResponsiveContainer to inject deterministic dimensions into the child chart in jsdom
vi.mock('recharts', async () => {
  const actual = await vi.importActual<typeof import('recharts')>('recharts');
  return {
    ...actual,
    ResponsiveContainer: ({ children }: { children: React.ReactElement<any> }) => (
      <div style={{ width: 640, height: 224 }}>
        {React.isValidElement(children)
          ? React.cloneElement(children as React.ReactElement<any>, {
              width: 640,
              height: 224,
            })
          : children}
      </div>
    ),
  };
});

describe('chartTheme utilities', () => {
  it('adapts bar sizing uniformly and keeps all bars slim across small, medium, and large datasets', () => {
    const smallGrouped = getAdaptiveBarConfig(2, 2);
    const mediumGrouped = getAdaptiveBarConfig(6, 2);
    const largeGrouped = getAdaptiveBarConfig(18, 2);
    const smallSingle = getAdaptiveBarConfig(2, 1);

    expect(smallGrouped.barSize).toBeLessThanOrEqual(12);
    expect(mediumGrouped.barSize).toBeLessThanOrEqual(smallGrouped.barSize);
    expect(largeGrouped.barSize).toBeLessThan(mediumGrouped.barSize);
    expect(smallSingle.barSize).toBeLessThanOrEqual(14);
    expect(smallGrouped.barGap).toBeGreaterThanOrEqual(4);
  });

  it('formats monthly, daily, and hourly ticks cleanly', () => {
    expect(formatAxisTick('2026-11', 'monthly')).toMatch(/Nov/i);
    expect(formatAxisTick('2026-11-20', 'daily')).toBe('Nov 20');
    expect(formatAxisTick('2026-11-20 14:00', 'hourly')).toBe('14:00');
    expect(formatPeriodLabel('2026-11', 'monthly')).toBe('November 2026');
  });

  it('truncates long category names with an ellipsis', () => {
    expect(truncateLabel('Bulan', 14)).toBe('Bulan');
    expect(truncateLabel('Sorsogon City Proper', 14)).toBe('Sorsogon City…');
  });
});

describe('Dashboard Recharts Components', () => {
  it('renders slim bars (<= 14px) in UserGrowthChart across small and large datasets', () => {
    const { container, rerender } = render(
      <UserGrowthChart
        data={[
          { name: '2026-10', workers: 14, employers: 5 },
          { name: '2026-11', workers: 22, employers: 8 },
        ]}
        intervalFilter="monthly"
      />
    );
    const bars = container.querySelectorAll('.recharts-bar-rectangle path, .recharts-bar-rectangle rect');
    expect(bars.length).toBe(4);
    bars.forEach((bar) => {
      const w = parseFloat(bar.getAttribute('width') || '0');
      expect(w).toBeGreaterThan(0);
      expect(w).toBeLessThanOrEqual(14);
    });

    rerender(
      <UserGrowthChart
        data={Array.from({ length: 16 }, (_, i) => ({
          name: `2026-11-${String(i + 1).padStart(2, '0')}`,
          workers: i + 2,
          employers: i + 1,
        }))}
        intervalFilter="daily"
        roleFilter="worker"
      />
    );
    const singleSeriesBars = container.querySelectorAll('.recharts-bar-rectangle path, .recharts-bar-rectangle rect');
    expect(singleSeriesBars.length).toBe(16);
    singleSeriesBars.forEach((bar) => {
      const w = parseFloat(bar.getAttribute('width') || '0');
      expect(w).toBeGreaterThan(0);
      expect(w).toBeLessThanOrEqual(14);
    });
  });

  it('renders both Job Posts and Applications series as slim bars in unstacked GeographicActivityChart', () => {
    const { container } = render(
      <GeographicActivityChart
        data={[
          { name: 'Bulan', jobs: 18, applications: 42 },
          { name: 'Irosin', jobs: 9, applications: 21 },
        ]}
        stacked={false}
      />
    );
    // 2 series (Job Posts + Applications) * 2 towns = 4 bar rectangles
    const bars = container.querySelectorAll('.recharts-bar-rectangle path, .recharts-bar-rectangle rect');
    expect(bars.length).toBe(4);
    bars.forEach((bar) => {
      const w = parseFloat(bar.getAttribute('width') || '0');
      expect(w).toBeGreaterThan(0);
      expect(w).toBeLessThanOrEqual(14);
    });
    expect(container.textContent).toContain('Job Posts');
    expect(container.textContent).toContain('Applications');
  });

  it('renders GeographicActivityChart in vertical mode for <= 7 towns and horizontal mode for > 7 towns', () => {
    const smallTowns = [
      { name: 'Bulan', jobs: 18, applications: 42 },
      { name: 'Irosin', jobs: 9, applications: 21 },
      { name: 'Sorsogon City', jobs: 14, applications: 33 },
    ];
    const { container, rerender } = render(
      <GeographicActivityChart data={smallTowns} stacked />
    );
    expect(container.querySelector('.h-56')).toBeTruthy();

    const manyBarangays = Array.from({ length: 10 }, (_, i) => ({
      name: `Barangay Zone ${i + 1}`,
      jobs: 10 - i,
      applications: 20 - i,
    }));
    rerender(<GeographicActivityChart data={manyBarangays} stacked />);
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper.style.height).toBe('364px');
  });

  it('renders visible dots on sparse/single-point ApplicationVolumeChart and ConversionVelocityChart datasets', () => {
    const appRes = render(
      <ApplicationVolumeChart
        data={[{ name: '2026-11-20', applications: 12, jobs: 4 }]}
        intervalFilter="daily"
      />
    );
    expect(appRes.container.querySelectorAll('.recharts-area-dot').length).toBeGreaterThanOrEqual(2);

    const velRes = render(
      <ConversionVelocityChart
        data={[
          { name: '2026-11-18', applications: 12, completed_hires: 3 },
          { name: '2026-11-19', applications: 19, completed_hires: 6 },
        ]}
        intervalFilter="daily"
      />
    );
    expect(velRes.container.querySelectorAll('.recharts-area-dot').length).toBeGreaterThanOrEqual(4);
  });

  it('renders slim bars in JobsDistributionChart and supports SkillDistributionPieChart Others drill-down', () => {
    const onSliceClick = vi.fn();
    const jobsRes = render(
      <JobsDistributionChart
        data={[
          { name: 'Construction', jobs: 15 },
          { name: 'Carpentry', jobs: 10 },
          { name: 'Others', jobs: 6, subItems: [{ name: 'Plumbing', value: 4 }, { name: 'Welding', value: 2 }] },
        ]}
      />
    );
    const jobBars = jobsRes.container.querySelectorAll('.recharts-bar-rectangle path, .recharts-bar-rectangle rect');
    expect(jobBars.length).toBe(3);
    jobBars.forEach((bar) => {
      const h = parseFloat(bar.getAttribute('height') || '0');
      expect(h).toBeGreaterThan(0);
      expect(h).toBeLessThanOrEqual(14);
    });

    const skillRes = render(
      <SkillDistributionPieChart
        data={[
          { name: 'Masonry', value: 24, category: 'Construction' },
          { name: 'Others', value: 11, subItems: [{ name: 'Tiling', value: 6 }, { name: 'Painting', value: 5 }] },
        ]}
        totalWorkers={35}
        onSliceClick={onSliceClick}
      />
    );
    const othersBtn = skillRes.getByRole('button', { name: /Others/i });
    fireEvent.click(othersBtn);
    expect(onSliceClick).toHaveBeenCalledTimes(1);
    expect(onSliceClick).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Others', value: 11 })
    );
  });
});
