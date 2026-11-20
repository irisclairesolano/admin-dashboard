import React from 'react';
import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';
import { render, fireEvent, act } from '@testing-library/react';
import UserGrowthChart from '@/components/dashboard/UserGrowthChart';
import GeographicActivityChart from '@/components/dashboard/GeographicActivityChart';
import ApplicationVolumeChart from '@/components/dashboard/ApplicationVolumeChart';
import ConversionVelocityChart from '@/components/dashboard/ConversionVelocityChart';
import JobsDistributionChart from '@/components/dashboard/JobsDistributionChart';
import SkillDistributionPieChart from '@/components/dashboard/SkillDistributionPieChart';
import {
  Bar3DVertical,
  Bar3DHorizontal,
  getAdaptiveBarConfig,
  formatAxisTick,
  formatPeriodLabel,
  isChartAnimationActive,
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
  it('renders slim 3D bars (<= 14px) in UserGrowthChart across small and large datasets', () => {
    const { container, rerender } = render(
      <UserGrowthChart
        data={[
          { name: '2026-10', workers: 14, employers: 5 },
          { name: '2026-11', workers: 22, employers: 8 },
        ]}
        intervalFilter="monthly"
      />
    );
    expect(container.querySelectorAll('.recharts-3d-bar-vertical').length).toBe(4);
    const bars = container.querySelectorAll('.recharts-bar-rectangle rect');
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
    const singleSeriesBars = container.querySelectorAll('.recharts-bar-rectangle rect');
    expect(singleSeriesBars.length).toBe(16);
    singleSeriesBars.forEach((bar) => {
      const w = parseFloat(bar.getAttribute('width') || '0');
      expect(w).toBeGreaterThan(0);
      expect(w).toBeLessThanOrEqual(14);
    });
  });

  it('renders both Job Posts and Applications series as slim 3D bars in unstacked GeographicActivityChart', () => {
    const { container } = render(
      <GeographicActivityChart
        data={[
          { name: 'Bulan', jobs: 18, applications: 42 },
          { name: 'Irosin', jobs: 9, applications: 21 },
        ]}
        stacked={false}
      />
    );
    // 2 series (Job Posts + Applications) * 2 towns = 4 3D bar rectangles
    expect(container.querySelectorAll('.recharts-3d-bar-vertical').length).toBe(4);
    const bars = container.querySelectorAll('.recharts-bar-rectangle rect');
    expect(bars.length).toBe(4);
    bars.forEach((bar) => {
      const w = parseFloat(bar.getAttribute('width') || '0');
      expect(w).toBeGreaterThan(0);
      expect(w).toBeLessThanOrEqual(14);
    });
    expect(container.textContent).toContain('Job Posts');
    expect(container.textContent).toContain('Applications');
  });

  it('renders GeographicActivityChart in vertical mode for <= 7 towns and 3D horizontal mode for > 7 towns', () => {
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
    expect(container.querySelectorAll('.recharts-3d-bar-horizontal').length).toBe(20);
  });

  it('renders visible dots and 3D shadow filters on ApplicationVolumeChart and ConversionVelocityChart', () => {
    const appRes = render(
      <ApplicationVolumeChart
        data={[{ name: '2026-11-20', applications: 12, jobs: 4 }]}
        intervalFilter="daily"
      />
    );
    expect(appRes.container.querySelectorAll('.recharts-area-dot').length).toBeGreaterThanOrEqual(2);
    expect(appRes.container.querySelector('#area3dShadowOverview')).toBeTruthy();

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
    expect(velRes.container.querySelector('#area3dShadowVelocity')).toBeTruthy();
  });

  it('renders slim 3D bars in JobsDistributionChart and 3D shadow filter in SkillDistributionPieChart', () => {
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
    expect(jobsRes.container.querySelectorAll('.recharts-3d-bar-horizontal').length).toBe(3);
    const jobBars = jobsRes.container.querySelectorAll('.recharts-bar-rectangle rect');
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
    expect(skillRes.container.querySelector('#pie3dShadow')).toBeTruthy();
    const othersBtn = skillRes.getByRole('button', { name: /Others/i });
    fireEvent.click(othersBtn);
    expect(onSliceClick).toHaveBeenCalledTimes(1);
    expect(onSliceClick).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Others', value: 11 })
    );
  });

  it('safely animates all 6 charts (prefers-reduced-motion: false) and handles empty data or non-finite bar dimensions', () => {
    const prevMatchMedia = window.matchMedia;
    const prevRAF = window.requestAnimationFrame;
    const prevCAF = window.cancelAnimationFrame;
    const prevGlobalRAF = globalThis.requestAnimationFrame;
    const prevGlobalCAF = globalThis.cancelAnimationFrame;
    const prevUserAgent = navigator.userAgent;

    const rafQueue: Array<{ id: number; cb: FrameRequestCallback }> = [];
    let nextId = 1;
    const mockRAF = (cb: FrameRequestCallback) => {
      const id = nextId++;
      rafQueue.push({ id, cb });
      return id;
    };
    const mockCAF = (id: number) => {
      const idx = rafQueue.findIndex((entry) => entry.id === id);
      if (idx !== -1) rafQueue.splice(idx, 1);
    };

    try {
      // Under jsdom reduced-motion mock, isChartAnimationActive() stays false for synchronous tests
      expect(isChartAnimationActive()).toBe(false);

      // In a real browser user agent (even if OS reduced-motion is set), animations remain enabled
      Object.defineProperty(navigator, 'userAgent', {
        configurable: true,
        value: 'Mozilla/5.0 Chrome/130.0.0.0',
      });
      expect(isChartAnimationActive()).toBe(true);

      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: vi.fn().mockImplementation(() => ({
          matches: false,
          media: '(prefers-reduced-motion: reduce)',
          onchange: null,
          addListener: vi.fn(),
          removeListener: vi.fn(),
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
          dispatchEvent: vi.fn(),
        })),
      });
      expect(isChartAnimationActive()).toBe(true);
      window.requestAnimationFrame = mockRAF;
      window.cancelAnimationFrame = mockCAF;
      globalThis.requestAnimationFrame = mockRAF;
      globalThis.cancelAnimationFrame = mockCAF;

      // Guard against non-finite dimensions inside Bar3D shapes
      const emptyVertical = render(
        <svg>
          <Bar3DVertical x={NaN} y={10} width={10} height={20} />
          <Bar3DHorizontal x={0} y={NaN} width={20} height={10} />
        </svg>
      );
      expect(emptyVertical.container.querySelectorAll('g').length).toBe(0);

      // Render all 6 charts with empty arrays AND populated arrays under active animations
      const { container } = render(
        <div>
          <UserGrowthChart data={[]} intervalFilter="hourly" />
          <ConversionVelocityChart data={[]} intervalFilter="hourly" />
          <ApplicationVolumeChart data={[]} intervalFilter="hourly" />
          <GeographicActivityChart data={[]} />
          <JobsDistributionChart data={[]} />
          <SkillDistributionPieChart data={[]} totalWorkers={0} />

          <UserGrowthChart
            data={[
              { name: '2026-11-20 08:00', workers: 6, employers: 3 },
              { name: '2026-11-20 09:00', workers: 9, employers: 4 },
            ]}
            intervalFilter="hourly"
          />
          <ConversionVelocityChart
            data={[
              { name: '2026-11-20 08:00', applications: 12, completed_hires: 4 },
              { name: '2026-11-20 09:00', applications: 18, completed_hires: 6 },
            ]}
            intervalFilter="hourly"
          />
          <ApplicationVolumeChart
            data={[{ name: '2026-11-20 08:00', applications: 12, jobs: 5 }]}
            intervalFilter="hourly"
          />
          <GeographicActivityChart
            data={[
              { name: 'Bulan', jobs: 5, applications: 12 },
              { name: 'Irosin', jobs: 3, applications: 8 },
            ]}
          />
          <JobsDistributionChart data={[{ name: 'Carpentry', jobs: 5 }]} />
          <SkillDistributionPieChart
            data={[{ name: 'Carpentry', value: 6, category: 'Construction' }]}
            totalWorkers={6}
          />
        </div>
      );

      for (let step = 1; step <= 25; step++) {
        const batch = rafQueue.splice(0, rafQueue.length);
        act(() => {
          batch.forEach(({ cb }) => cb(step * 60));
        });
      }

      expect(container.querySelectorAll('svg').length).toBeGreaterThanOrEqual(6);
      expect(container.querySelector('#area3dShadowVelocity')).toBeTruthy();
    } finally {
      Object.defineProperty(navigator, 'userAgent', {
        configurable: true,
        value: prevUserAgent,
      });
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: prevMatchMedia,
      });
      window.requestAnimationFrame = prevRAF;
      window.cancelAnimationFrame = prevCAF;
      globalThis.requestAnimationFrame = prevGlobalRAF;
      globalThis.cancelAnimationFrame = prevGlobalCAF;
    }
  });
});
