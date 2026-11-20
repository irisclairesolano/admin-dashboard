import React from 'react';
import { describe, it, expect, vi } from 'vitest';
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

// Mock ResponsiveContainer to provide deterministic dimensions in jsdom
vi.mock('recharts', async () => {
  const actual = await vi.importActual<typeof import('recharts')>('recharts');
  return {
    ...actual,
    ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
      <div style={{ width: 640, height: 224 }}>{children}</div>
    ),
  };
});

describe('chartTheme utilities', () => {
  it('adapts bar sizing cleanly for small, medium, and large datasets', () => {
    const smallGrouped = getAdaptiveBarConfig(2, 2);
    const mediumGrouped = getAdaptiveBarConfig(6, 2);
    const largeGrouped = getAdaptiveBarConfig(18, 2);

    expect(smallGrouped.barSize).toBeLessThanOrEqual(16);
    expect(mediumGrouped.barSize).toBeLessThanOrEqual(smallGrouped.barSize);
    expect(largeGrouped.barSize).toBeLessThan(mediumGrouped.barSize);
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
  it('renders UserGrowthChart with small and large datasets without errors', () => {
    const { container, rerender } = render(
      <UserGrowthChart
        data={[
          { name: '2026-10', workers: 14, employers: 5 },
          { name: '2026-11', workers: 22, employers: 8 },
        ]}
        intervalFilter="monthly"
      />
    );
    expect(container.firstChild).toBeTruthy();

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
    expect(container.firstChild).toBeTruthy();
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

  it('renders ApplicationVolumeChart and ConversionVelocityChart cleanly', () => {
    const appRes = render(
      <ApplicationVolumeChart
        data={[
          { name: '2026-11-18', applications: 12, jobs: 4 },
          { name: '2026-11-19', applications: 19, jobs: 7 },
        ]}
        intervalFilter="daily"
      />
    );
    expect(appRes.container.firstChild).toBeTruthy();

    const velRes = render(
      <ConversionVelocityChart
        data={[
          { name: '2026-11-18', applications: 12, completed_hires: 3 },
          { name: '2026-11-19', applications: 19, completed_hires: 6 },
        ]}
        intervalFilter="daily"
      />
    );
    expect(velRes.container.firstChild).toBeTruthy();
  });

  it('renders JobsDistributionChart and SkillDistributionPieChart with Others drill-down', () => {
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
    expect(jobsRes.container.firstChild).toBeTruthy();

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
