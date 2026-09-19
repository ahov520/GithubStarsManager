import React, { useMemo } from 'react';
import { Search, Calendar, Compass, Settings, FileCode2, GitFork } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { useShallow } from 'zustand/react/shallow';
import { HeaderMenuId, AppState } from '../types';

const MENU_META: Record<HeaderMenuId, {
  icon: React.ComponentType<{ className?: string }>;
  labelZh: string;
  labelEn: string;
}> = {
  repositories: { icon: Search, labelZh: '仓库', labelEn: 'Stars' },
  releases: { icon: Calendar, labelZh: '发布', labelEn: 'Releases' },
  subscription: { icon: Compass, labelZh: '发现', labelEn: 'Discover' },
  settings: { icon: Settings, labelZh: '设置', labelEn: 'Settings' },
  gists: { icon: FileCode2, labelZh: 'Gist', labelEn: 'Gist' },
  forks: { icon: GitFork, labelZh: '复刻', labelEn: 'Forks' },
};

export const BottomNav: React.FC = () => {
  const { currentView, setCurrentView, headerMenuConfig, language } = useAppStore(
    useShallow((state) => ({
      currentView: state.currentView,
      setCurrentView: state.setCurrentView,
      headerMenuConfig: state.headerMenuConfig,
      language: state.language,
    }))
  );

  const t = (zh: string, en: string) => (language === 'zh' ? zh : en);

  // Derive visible navigation items directly from the user's sorted headerMenuConfig
  const visibleNavItems = useMemo(() => {
    const sorted = [...(headerMenuConfig || [])]
      .filter((item) => item.visible && MENU_META[item.id])
      .sort((a, b) => a.order - b.order);

    if (sorted.length === 0) {
      return [{ id: 'repositories' as HeaderMenuId, meta: MENU_META.repositories }];
    }

    return sorted.map((item) => ({
      id: item.id,
      meta: MENU_META[item.id],
    }));
  }, [headerMenuConfig]);

  return (
    <nav
      aria-label={t('移动端底部导航', 'Mobile bottom navigation')}
      className="fixed bottom-0 inset-x-0 z-40 bg-card/95 dark:bg-card/95 backdrop-blur-md border-t border-border md:hidden safe-area-bottom shadow-[0_-1px_3px_rgba(0,0,0,0.05)] transition-colors"
    >
      <div className="flex items-center justify-around h-14 max-w-lg mx-auto px-1">
        {visibleNavItems.map(({ id, meta }) => {
          const Icon = meta.icon;
          const isActive = currentView === id;
          const label = t(meta.labelZh, meta.labelEn);

          return (
            <button
              key={id}
              type="button"
              onClick={() => setCurrentView(id as AppState['currentView'])}
              aria-current={isActive ? 'page' : undefined}
              aria-label={label}
              className={`flex-1 min-h-[44px] min-w-[44px] flex flex-col items-center justify-center gap-0.5 rounded-lg py-1 px-1 text-xs transition-all active:scale-95 ${
                isActive
                  ? 'text-primary font-semibold'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <div className="relative flex items-center justify-center">
                <Icon className={`h-5 w-5 transition-transform ${isActive ? 'scale-110' : ''}`} />
                {isActive && (
                  <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-primary rounded-full" />
                )}
              </div>
              <span className="text-[11px] leading-tight tracking-tight mt-0.5 truncate max-w-[64px]">
                {label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
