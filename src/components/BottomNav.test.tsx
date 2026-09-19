import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BottomNav } from './BottomNav';
import type { HeaderMenuItem } from '../types';

const mockSetCurrentView = vi.fn();
let mockCurrentView = 'repositories';
let mockLanguage = 'zh';
let mockHeaderMenuConfig: HeaderMenuItem[] = [
  { id: 'repositories', visible: true, order: 0 },
  { id: 'gists', visible: true, order: 1 },
  { id: 'releases', visible: true, order: 2 },
  { id: 'forks', visible: true, order: 3 },
  { id: 'subscription', visible: true, order: 4 },
  { id: 'settings', visible: true, order: 5 },
];

vi.mock('../store/useAppStore', () => ({
  useAppStore: vi.fn((selector) =>
    selector({
      currentView: mockCurrentView,
      setCurrentView: mockSetCurrentView,
      headerMenuConfig: mockHeaderMenuConfig,
      language: mockLanguage,
    })
  ),
}));

describe('BottomNav', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCurrentView = 'repositories';
    mockLanguage = 'zh';
    mockHeaderMenuConfig = [
      { id: 'repositories', visible: true, order: 0 },
      { id: 'gists', visible: true, order: 1 },
      { id: 'releases', visible: true, order: 2 },
      { id: 'forks', visible: true, order: 3 },
      { id: 'subscription', visible: true, order: 4 },
      { id: 'settings', visible: true, order: 5 },
    ];
  });

  it('renders all visible items ordered by user configuration in Chinese', () => {
    render(<BottomNav />);
    const buttons = screen.getAllByRole('button');
    expect(buttons).toHaveLength(6);
    expect(buttons[0]).toHaveTextContent('仓库');
    expect(buttons[1]).toHaveTextContent('Gist');
    expect(buttons[2]).toHaveTextContent('发布');
    expect(buttons[3]).toHaveTextContent('复刻');
    expect(buttons[4]).toHaveTextContent('发现');
    expect(buttons[5]).toHaveTextContent('设置');
  });

  it('renders correct labels in English', () => {
    mockLanguage = 'en';
    render(<BottomNav />);
    const buttons = screen.getAllByRole('button');
    expect(buttons[0]).toHaveTextContent('Stars');
    expect(buttons[1]).toHaveTextContent('Gist');
    expect(buttons[2]).toHaveTextContent('Releases');
    expect(buttons[3]).toHaveTextContent('Forks');
    expect(buttons[4]).toHaveTextContent('Discover');
    expect(buttons[5]).toHaveTextContent('Settings');
  });

  it('respects user custom order from menu management', () => {
    // Reorder: releases first (order 0), then repositories (order 1)
    mockHeaderMenuConfig = [
      { id: 'releases', visible: true, order: 0 },
      { id: 'repositories', visible: true, order: 1 },
      { id: 'settings', visible: true, order: 2 },
    ];
    render(<BottomNav />);
    const buttons = screen.getAllByRole('button');
    expect(buttons).toHaveLength(3);
    expect(buttons[0]).toHaveTextContent('发布');
    expect(buttons[1]).toHaveTextContent('仓库');
    expect(buttons[2]).toHaveTextContent('设置');
  });

  it('filters out hidden menus', () => {
    mockHeaderMenuConfig = [
      { id: 'repositories', visible: true, order: 0 },
      { id: 'gists', visible: false, order: 1 },
      { id: 'releases', visible: true, order: 2 },
      { id: 'settings', visible: true, order: 3 },
    ];
    render(<BottomNav />);
    const buttons = screen.getAllByRole('button');
    expect(buttons).toHaveLength(3);
    expect(screen.queryByText('Gist')).not.toBeInTheDocument();
  });

  it('highlights the current view with aria-current="page"', () => {
    mockCurrentView = 'releases';
    render(<BottomNav />);
    const activeBtn = screen.getByRole('button', { name: '发布' });
    expect(activeBtn).toHaveAttribute('aria-current', 'page');

    const inactiveBtn = screen.getByRole('button', { name: '仓库' });
    expect(inactiveBtn).not.toHaveAttribute('aria-current');
  });

  it('calls setCurrentView when clicked', () => {
    render(<BottomNav />);
    const releasesBtn = screen.getByRole('button', { name: '发布' });
    fireEvent.click(releasesBtn);
    expect(mockSetCurrentView).toHaveBeenCalledTimes(1);
    expect(mockSetCurrentView).toHaveBeenCalledWith('releases');
  });

  it('every navigation button has >=44px touch target classes', () => {
    render(<BottomNav />);
    const buttons = screen.getAllByRole('button');
    for (const btn of buttons) {
      expect(btn.className).toContain('min-h-[44px]');
      expect(btn.className).toContain('min-w-[44px]');
    }
  });

  it('falls back to default repositories item if all items hidden or config empty', () => {
    mockHeaderMenuConfig = [];
    render(<BottomNav />);
    const buttons = screen.getAllByRole('button');
    expect(buttons).toHaveLength(1);
    expect(buttons[0]).toHaveTextContent('仓库');
  });
});
