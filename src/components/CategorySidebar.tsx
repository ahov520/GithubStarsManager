import { Button } from './ui/button';
import React, { useMemo, useState, useEffect, useCallback, useRef } from 'react';
import {
  Plus,
  Edit3,
  Trash2,
  EyeOff,
  ChevronLeft,
  ChevronRight,
  Undo2,
  FolderTree,
  Search,
  X,
} from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from './ui/sheet';
import { Input } from './ui/input';
import { Category, Repository } from '../types';
import { useAppStore, getAllCategories, sortCategoriesByOrder } from '../store/useAppStore';
import { useRepositoryDragStore } from '../store/useRepositoryDragStore';
import { useShallow } from 'zustand/react/shallow';
import { CategoryEditModal } from './CategoryEditModal';
import { useCategorySyncActions } from '../features/repositories/hooks/useCategorySyncActions';
import { buildRepositoryCategoryAssignment, matchesCategory } from '../utils/categoryUtils';
import { useDialog } from '../hooks/useDialog';

interface CategorySidebarProps {
  repositories: Repository[];
  selectedCategory: string;
  onCategorySelect: (category: string) => void;
}

export const CategorySidebar: React.FC<CategorySidebarProps> = ({
  repositories,
  selectedCategory,
  onCategorySelect
}) => {
  const {
    customCategories,
    hiddenDefaultCategoryIds,
    defaultCategoryOverrides,
    categoryOrder,
    collapsedSidebarCategoryCount,
    categoryMatchMode,
    deleteCustomCategory,
    hideDefaultCategory,
    showDefaultCategory,
    language,
    updateRepository,
    isSidebarCollapsed,
    setSidebarCollapsed,
  } = useAppStore(useShallow((state) => ({
    customCategories: state.customCategories,
    hiddenDefaultCategoryIds: state.hiddenDefaultCategoryIds,
    defaultCategoryOverrides: state.defaultCategoryOverrides,
    categoryOrder: state.categoryOrder,
    collapsedSidebarCategoryCount: state.collapsedSidebarCategoryCount,
    categoryMatchMode: state.categoryMatchMode,
    deleteCustomCategory: state.deleteCustomCategory,
    hideDefaultCategory: state.hideDefaultCategory,
    showDefaultCategory: state.showDefaultCategory,
    language: state.language,
    updateRepository: state.updateRepository,
    isSidebarCollapsed: state.isSidebarCollapsed,
    setSidebarCollapsed: state.setSidebarCollapsed,
  })));

  const { toast, confirm } = useDialog();
  const { forceSyncToBackend } = useCategorySyncActions();
  // 仓库卡片拖拽中：驱动「全部分类」变为「取消分类」热区提示
  const isRepoDragging = useRepositoryDragStore((state) => state.isDragging);

  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [isCreatingCategory, setIsCreatingCategory] = useState(false);
  const [dragOverCategoryId, setDragOverCategoryId] = useState<string | null>(null);
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);
  const [categoryQuery, setCategoryQuery] = useState('');
  // 用于防止拖拽后触发点击的标志
  const justDroppedRef = useRef(false);
  const dropTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // isMobile 初始值从 window.innerWidth 同步获取（SSR安全）
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.innerWidth < 1024;
  });
  // 控制文字显示的状态：等侧栏展开动效完成后再显示文字
  const [showText, setShowText] = useState(!isSidebarCollapsed);

  // 用于存储 showText 定时器的 ref
  const showTextTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // 用于存储 toggleSidebar 定时器的 ref
  const toggleSidebarTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // 分类列表滚动容器的 ref
  const categoryListRef = useRef<HTMLDivElement>(null);
  // 滚动条显示定时器 ref
  const scrollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [isScrolling, setIsScrolling] = useState(false);

  // 监听侧栏状态变化，同步更新文字显示状态
  useEffect(() => {
    if (isSidebarCollapsed) {
      setShowText(false);
    } else {
      // 清除之前的定时器
      if (showTextTimerRef.current) {
        clearTimeout(showTextTimerRef.current);
      }
      // 侧栏展开时，延迟显示文字，使用更短的延迟让体验更流畅
      showTextTimerRef.current = setTimeout(() => setShowText(true), 150);
    }
    return () => {
      if (showTextTimerRef.current) {
        clearTimeout(showTextTimerRef.current);
      }
    };
  }, [isSidebarCollapsed]);

  // 检测屏幕尺寸
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // 切换侧栏折叠状态
  const toggleSidebar = useCallback(() => {
    // 清除之前的定时器
    if (toggleSidebarTimerRef.current) {
      clearTimeout(toggleSidebarTimerRef.current);
    }
    if (isSidebarCollapsed) {
      // 展开侧栏：先展开，再显示文字
      setSidebarCollapsed(false);
      toggleSidebarTimerRef.current = setTimeout(() => setShowText(true), 150); // 150ms 后显示文字，配合动效
    } else {
      // 折叠侧栏：先隐藏文字，再折叠
      setShowText(false);
      toggleSidebarTimerRef.current = setTimeout(() => setSidebarCollapsed(true), 120); // 120ms 后折叠，文字先消失
    }
  }, [isSidebarCollapsed, setSidebarCollapsed]);

  // 处理分类列表滚动事件
  const handleCategoryScroll = useCallback(() => {
    setIsScrolling(true);
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }
    // 滚动停止 1 秒后隐藏滚动条
    scrollTimeoutRef.current = setTimeout(() => {
      setIsScrolling(false);
    }, 1000);
  }, []);

  // 组件卸载时清理定时器
  useEffect(() => {
    return () => {
      if (toggleSidebarTimerRef.current) {
        clearTimeout(toggleSidebarTimerRef.current);
      }
      if (dropTimeoutRef.current) {
        clearTimeout(dropTimeoutRef.current);
      }
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, []);

  // 键盘快捷键支持 (Ctrl/Cmd + B)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const active = document.activeElement as HTMLElement | null;
      const isEditable = active?.tagName === 'INPUT' ||
                         active?.tagName === 'TEXTAREA' ||
                         active?.isContentEditable ||
                         active?.getAttribute('role') === 'textbox';
      if (isEditable) return;

      // 移动端时键盘快捷键不执行折叠切换，避免修改持久化状态
      if (isMobile) return;

      if ((e.ctrlKey || e.metaKey) && e.key === 'b') {
        e.preventDefault();
        toggleSidebar();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [toggleSidebar, isMobile]);

  const allCategories = useMemo(() => {
    const categories = getAllCategories(customCategories, language, hiddenDefaultCategoryIds, defaultCategoryOverrides);
    return sortCategoriesByOrder(categories, categoryOrder);
  }, [customCategories, language, hiddenDefaultCategoryIds, defaultCategoryOverrides, categoryOrder]);

  const drawerCategories = useMemo(() => {
    const query = categoryQuery.trim().toLowerCase();
    if (!query) return allCategories;
    return allCategories.filter((category) => category.name.toLowerCase().includes(query));
  }, [allCategories, categoryQuery]);

  const chipScrollerRef = useRef<HTMLDivElement>(null);
  const chipRefs = useRef(new Map<string, HTMLButtonElement>());

  useEffect(() => {
    if (!isMobile) return;
    const scroller = chipScrollerRef.current;
    const chip = chipRefs.current.get(selectedCategory);
    if (!scroller || !chip) return;
    const chipLeft = chip.offsetLeft;
    const chipRight = chipLeft + chip.offsetWidth;
    const viewLeft = scroller.scrollLeft;
    const viewRight = viewLeft + scroller.clientWidth;
    if (chipLeft >= viewLeft && chipRight <= viewRight) return;
    const nextLeft = Math.max(0, chipLeft - 12);
    if (typeof scroller.scrollTo === 'function') {
      scroller.scrollTo({ left: nextLeft, behavior: 'smooth' });
    } else {
      scroller.scrollLeft = nextLeft;
    }
  }, [isMobile, selectedCategory, allCategories]);

  const repositoryMap = useMemo(() => new Map(repositories.map(repo => [String(repo.id), repo])), [repositories]);

  const categoryCounts = useMemo(() => {
    const counts = new Map<string, number>();
    counts.set('all', repositories.length);
    
    for (const category of allCategories) {
      if (category.id === 'all') continue;
      const count = repositories.filter(repo => matchesCategory(repo, category, categoryMatchMode)).length;
      counts.set(category.id, count);
    }
    return counts;
  }, [repositories, allCategories, categoryMatchMode]);

  const getCategoryCount = useCallback((category: Category) => {
    return categoryCounts.get(category.id) ?? 0;
  }, [categoryCounts]);

  const handleAddCategory = () => {
    setIsCreatingCategory(true);
    setEditingCategory(null);
    setEditModalOpen(true);
  };

  const handleEditCategory = (category: Category) => {
    setIsCreatingCategory(false);
    setEditingCategory(category);
    setEditModalOpen(true);
  };

  const handleDeleteCategory = async (category: Category) => {
    const confirmed = await confirm(
      t('删除分类确认', 'Delete Category Confirmation'),
      t(
        `确定删除自定义分类"${category.name}"吗？\n\n仓库会保留，Star 不会取消，只会清空它们的手动分类归属。`,
        `Delete custom category "${category.name}"?\n\nRepositories will stay starred. Only their manual category assignment will be cleared.`
      ),
      { type: 'danger', confirmText: t('删除', 'Delete') }
    );

    if (!confirmed) return;

    deleteCustomCategory(category.id);
    try {
      await forceSyncToBackend();
    } catch {
      toast(t('删除分类失败，请检查后端连接。', 'Failed to delete category. Please check backend connection.'), 'error');
    }
  };

  const handleHideDefaultCategory = async (category: Category) => {
    const confirmed = await confirm(
      t('隐藏分类确认', 'Hide Category Confirmation'),
      t(
        `隐藏默认分类"${category.name}"？\n\n这不会删除任何仓库，只是在左侧隐藏这个预设分类。`,
        `Hide default category "${category.name}"?\n\nThis will not delete any repositories. It only hides this built-in category from the sidebar.`
      ),
      { type: 'warning' }
    );

    if (!confirmed) return;

    hideDefaultCategory(category.id);
    try {
      await forceSyncToBackend();
    } catch {
      showDefaultCategory(category.id);
      toast(t('隐藏分类失败，请检查后端连接。', 'Failed to hide category. Please check backend connection.'), 'error');
    }
  };

  const handleCloseModal = () => {
    setEditModalOpen(false);
    setEditingCategory(null);
    setIsCreatingCategory(false);
  };

  const handleSyncError = (originalRepo: Repository) => {
    updateRepository(originalRepo);
    setDragOverCategoryId(null);
    toast(
      language === 'zh'
        ? `同步到后端失败，已恢复分类更改。`
        : `Failed to sync to backend. Category change has been reverted.`,
      'error'
    );
  };

  const handleDropOnCategory = async (event: React.DragEvent<HTMLDivElement>, category: Category) => {
    event.preventDefault();
    setDragOverCategoryId(null);

    // 设置标志防止拖拽后触发点击
    justDroppedRef.current = true;
    if (dropTimeoutRef.current) {
      clearTimeout(dropTimeoutRef.current);
    }
    dropTimeoutRef.current = setTimeout(() => {
      justDroppedRef.current = false;
    }, 300);

    // drop 先于 dragend 派发；若当前正处于某分类视图，源卡片即将因分类变更
    // 从列表卸载，其 React dragend 将丢失，这里显式复位拖拽状态（issue #353）
    useRepositoryDragStore.getState().endDrag();

    const repoId = event.dataTransfer.getData('application/x-gsm-repository-id');
    const repository = repositoryMap.get(repoId);
    if (!repository) return;

    const allCategoriesList = getAllCategories(customCategories, language, hiddenDefaultCategoryIds, defaultCategoryOverrides);
    const nextRepo = buildRepositoryCategoryAssignment(repository, category, allCategoriesList);
    if (!nextRepo) return;

    const originalRepo = { ...repository };
    updateRepository(nextRepo);

    try {
      await forceSyncToBackend();
    } catch {
      handleSyncError(originalRepo);
    }
  };

  // 处理分类点击，防止拖拽后立即触发
  const handleCategoryClick = (categoryId: string) => {
    if (justDroppedRef.current) {
      return;
    }
    onCategorySelect(categoryId);
  };

  const t = (zh: string, en: string) => language === 'zh' ? zh : en;

  return (
    <>
      {/* 移动端：紧凑可折叠抽屉式分类栏 (<1024px) */}
      {isMobile ? (
        <div className="w-full rounded-xl border border-border/80 bg-card p-3 shadow-sm transition-all">
          <div className="flex items-center justify-between gap-2 mb-2.5">
            {/* 分类抽屉触发按钮 */}
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsMobileDrawerOpen(true)}
              className="touch-target-44 flex min-w-0 flex-1 items-center justify-between gap-2 rounded-lg border-border/80 bg-background/50 px-3 py-2 text-left hover:bg-accent"
              aria-label={t('打开分类抽屉', 'Open categories drawer')}
            >
              <div className="flex items-center gap-2 min-w-0">
                <FolderTree className="h-4 w-4 text-primary shrink-0" />
                <span className="text-xs text-muted-foreground hidden sm:inline">{t('当前分类:', 'Category:')}</span>
                <span className="text-sm font-semibold text-foreground truncate">
                  {allCategories.find(c => c.id === selectedCategory)?.name ?? t('全部分类', 'All')}
                </span>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
                  {getCategoryCount(allCategories.find(c => c.id === selectedCategory) ?? allCategories[0] ?? { id: 'all', name: 'All', icon: '📁', keywords: [] })}
                </span>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </div>
            </Button>

            {/* 添加分类按钮 */}
            <Button
              variant="ghost"
              onClick={handleAddCategory}
              size="icon"
              className="touch-target-44 h-11 w-11 shrink-0 rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground"
              title={t('添加分类', 'Add Category')}
              aria-label={t('添加分类', 'Add Category')}
            >
              <Plus className="w-5 h-5" />
            </Button>
          </div>

          {/* 移动端横向快捷分类标签（>=44px触控区）。右侧渐变提示后面还有分类。 */}
          <div className="relative">
          <div ref={chipScrollerRef} className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide snap-x snap-mandatory">
            {allCategories.map(category => {
              const count = getCategoryCount(category);
              const isSelected = selectedCategory === category.id;
              const isDragTarget = dragOverCategoryId === category.id;
              const isUncategorizeHotspot = category.id === 'all' && isRepoDragging;

              return (
                <div
                  key={category.id}
                  className="group shrink-0 snap-start"
                  onDragOver={(event) => {
                    event.preventDefault();
                    setDragOverCategoryId(category.id);
                  }}
                  onDragLeave={() => {
                    if (dragOverCategoryId === category.id) {
                      setDragOverCategoryId(null);
                    }
                  }}
                  onDrop={(event) => handleDropOnCategory(event, category)}
                >
                  <Button
                    ref={(node) => {
                      if (node) chipRefs.current.set(category.id, node);
                      else chipRefs.current.delete(category.id);
                    }}
                    variant="ghost"
                    onClick={() => handleCategoryClick(category.id)}
                    aria-label={`${isUncategorizeHotspot ? t('取消分类', 'Uncategorize') : category.name} ${count}`}
                    className={`touch-target-44 relative flex w-auto max-w-[9rem] items-center rounded-lg px-2.5 py-2 text-left transition-all ${
                      isDragTarget
                        ? isUncategorizeHotspot
                          ? 'bg-warning/10 text-warning ring-1 ring-warning/40'
                          : 'bg-success/10 text-success ring-1 ring-success/40'
                        : isUncategorizeHotspot
                          ? 'border border-dashed border-warning/50 bg-warning/5 text-warning'
                          : isSelected
                            ? 'bg-primary/10 text-primary font-semibold ring-1 ring-primary/20 shadow-xs'
                            : 'bg-muted/40 text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                    }`}
                    title={category.id !== 'all' ? category.name + " — " + t('可将仓库卡片拖到这里快速改分类', 'Drag repository cards here to quickly change category') : (isUncategorizeHotspot ? t('拖到这里取消分类', 'Drop here to remove category') : undefined)}
                    aria-pressed={isSelected}
                    aria-current={isSelected ? 'page' : undefined}
                  >
                    <div className="flex min-w-0 items-center gap-1.5">
                      <span className="shrink-0 text-base">
                        {isUncategorizeHotspot ? <Undo2 className="h-4 w-4" /> : category.icon}
                      </span>
                      <span className="truncate text-xs font-medium">
                        {isUncategorizeHotspot ? t('取消分类', 'Uncategorize') : category.name}
                      </span>
                    </div>
                  </Button>
                </div>
              );
            })}
          </div>
          <div className="pointer-events-none absolute inset-y-0 left-0 w-4 bg-gradient-to-r from-card to-transparent" aria-hidden="true" />
          <div className="pointer-events-none absolute inset-y-0 right-0 w-6 bg-gradient-to-l from-card to-transparent" aria-hidden="true" data-testid="category-chip-fade" />
          </div>

          {/* 移动端分类抽屉 Sheet */}
          <Sheet open={isMobileDrawerOpen} onOpenChange={(open) => {
            setIsMobileDrawerOpen(open);
            if (!open) setCategoryQuery('');
          }}>
            <SheetContent side="left" showClose={false} className="w-[86vw] max-w-sm p-0 flex flex-col h-full bg-card safe-area-bottom">
              <SheetHeader className="p-4 border-b border-border text-left">
                <div className="flex items-center justify-between">
                  <div className="min-w-0 pr-2">
                    <SheetTitle className="text-base font-semibold">
                      {t('应用分类', 'Categories')}
                    </SheetTitle>
                    <SheetDescription className="text-xs text-muted-foreground mt-0.5 truncate">
                      {t('管理与切换仓库分类', 'Manage and switch repository categories')}
                    </SheetDescription>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setIsMobileDrawerOpen(false);
                        handleAddCategory();
                      }}
                      className="touch-target-44 gap-1 px-2.5 text-xs"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>{t('新建', 'New')}</span>
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setIsMobileDrawerOpen(false)}
                      className="touch-target-44 h-9 w-9 text-muted-foreground hover:text-foreground"
                      aria-label={t('关闭分类抽屉', 'Close categories drawer')}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </SheetHeader>

              <div className="px-4 pt-3">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="mobile-category-search"
                    value={categoryQuery}
                    onChange={(event) => setCategoryQuery(event.target.value)}
                    aria-label={t('搜索分类', 'Search categories')}
                    placeholder={t('搜索分类…', 'Search categories…')}
                    className="h-11 pl-9 pr-12"
                  />
                  {categoryQuery && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-1 top-1/2 h-11 w-11 -translate-y-1/2"
                      aria-label={t('清除分类搜索', 'Clear category search')}
                      onClick={() => setCategoryQuery('')}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-3 space-y-1.5 safe-area-bottom">
                {drawerCategories.length === 0 && (
                  <p className="px-2 py-6 text-center text-sm text-muted-foreground">
                    {t('没有匹配的分类', 'No matching categories')}
                  </p>
                )}
                {drawerCategories.map(category => {
                  const count = getCategoryCount(category);
                  const isSelected = selectedCategory === category.id;
                  const isDragTarget = dragOverCategoryId === category.id;
                  const isUncategorizeHotspot = category.id === 'all' && isRepoDragging;

                  return (
                    <div
                      key={category.id}
                      className="group relative flex items-center justify-between rounded-lg hover:bg-accent/40 transition-colors"
                      onDragOver={(event) => {
                        event.preventDefault();
                        setDragOverCategoryId(category.id);
                      }}
                      onDragLeave={() => {
                        if (dragOverCategoryId === category.id) {
                          setDragOverCategoryId(null);
                        }
                      }}
                      onDrop={(event) => handleDropOnCategory(event, category)}
                    >
                      <button
                        type="button"
                        onClick={() => {
                          handleCategoryClick(category.id);
                          setIsMobileDrawerOpen(false);
                        }}
                        className={`touch-target-44 flex min-w-0 flex-1 items-center justify-between rounded-lg px-3.5 py-3 text-left transition-all ${
                          isDragTarget
                            ? isUncategorizeHotspot
                              ? 'bg-warning/10 text-warning ring-1 ring-warning/40'
                              : 'bg-success/10 text-success ring-1 ring-success/40'
                            : isUncategorizeHotspot
                              ? 'border border-dashed border-warning/50 bg-warning/5 text-warning'
                              : isSelected
                                ? 'bg-primary/10 text-primary font-semibold'
                                : 'text-foreground hover:bg-accent hover:text-accent-foreground'
                        }`}
                      >
                        <div className="flex items-center space-x-3 min-w-0 flex-1">
                          <span className="text-lg shrink-0">
                            {isUncategorizeHotspot ? <Undo2 className="h-4 w-4" /> : category.icon}
                          </span>
                          <span className="text-sm font-medium truncate">
                            {isUncategorizeHotspot ? t('取消分类', 'Uncategorize') : category.name}
                          </span>
                        </div>
                        <span
                          className={`ml-2 shrink-0 rounded-full px-2.5 py-0.5 text-xs ${
                            isSelected
                              ? 'bg-primary text-primary-foreground font-semibold'
                              : 'bg-muted text-muted-foreground'
                          }`}
                        >
                          {count}
                        </span>
                      </button>

                      {category.id !== 'all' && (
                        <div className="flex items-center gap-0.5 pr-2 shrink-0">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => {
                              e.stopPropagation();
                              setIsMobileDrawerOpen(false);
                              handleEditCategory(category);
                            }}
                            className="touch-target-44 h-9 w-9 text-muted-foreground hover:text-foreground"
                            title={t('编辑分类', 'Edit category')}
                            aria-label={t('编辑分类', 'Edit category')}
                          >
                            <Edit3 className="w-4 h-4" />
                          </Button>
                          {category.isCustom ? (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={(e) => {
                                e.stopPropagation();
                                setIsMobileDrawerOpen(false);
                                void handleDeleteCategory(category);
                              }}
                              className="touch-target-44 h-9 w-9 text-muted-foreground hover:text-destructive"
                              title={t('删除分类', 'Delete category')}
                              aria-label={t('删除分类', 'Delete category')}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          ) : (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={(e) => {
                                e.stopPropagation();
                                setIsMobileDrawerOpen(false);
                                void handleHideDefaultCategory(category);
                              }}
                              className="touch-target-44 h-9 w-9 text-muted-foreground hover:text-foreground"
                              title={t('隐藏默认分类', 'Hide default category')}
                              aria-label={t('隐藏默认分类', 'Hide default category')}
                            >
                              <EyeOff className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      ) : (
        /* 桌面端：可折叠侧栏 - sticky定位，滚动时保持可见 */
        <div className="relative flex shrink-0 lg:sticky lg:top-16 lg:self-start z-10">
          {/* 侧栏容器 */}
          <div
              className={`linear-sidebar relative overflow-visible transition-all duration-200 ease-out ${
              isSidebarCollapsed
                ? 'w-14 p-2'
                : 'w-64 p-4'
            }`}
            style={{
              maxHeight: isSidebarCollapsed ? 'calc(100vh - 8rem)' : 'calc(100vh - 8rem)',
              transitionProperty: 'width, padding, max-height',
            }}
          >
            {/* 折叠状态：简洁视图 */}
            {isSidebarCollapsed ? (
              <div className="flex flex-col items-center space-y-3 max-h-[calc(100vh-12rem)] overflow-y-auto scrollbar-hide">
                {/* 展开按钮 - 放在折叠状态的顶部 */}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={toggleSidebar}
                  className="linear-icon-button w-8 h-8 flex items-center justify-center transition-colors duration-200"
                  title={t('展开侧栏 (Ctrl/Cmd+B)', 'Expand Sidebar (Ctrl/Cmd+B)')}
                  aria-label={t('展开侧栏', 'Expand Sidebar')}
                  aria-expanded="false"
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>

                <div className="h-px w-full bg-border" />

                {/* 折叠状态下的分类图标列表 */}
                <div className="flex flex-col items-center space-y-2">
                  {(() => {
                    // 确保选中分类在显示列表中
                    const selectedIndex = allCategories.findIndex(c => c.id === selectedCategory);
                    const isSelectedHidden = selectedIndex >= collapsedSidebarCategoryCount;
                    let displayCategories = allCategories.slice(0, collapsedSidebarCategoryCount);
                    if (isSelectedHidden && selectedIndex !== -1) {
                      // 用选中分类替换最后一个
                      displayCategories = [...allCategories.slice(0, collapsedSidebarCategoryCount - 1), allCategories[selectedIndex]];
                    }
                    return displayCategories.map((category) => {
                      const isSelected = selectedCategory === category.id;
                      const isDragTarget = dragOverCategoryId === category.id;
                      const isUncategorizeHotspot = category.id === 'all' && isRepoDragging;
                      return (
                        <div
                          key={category.id}
                          className="group relative"
                          onDragOver={(event) => {
                            event.preventDefault();
                            setDragOverCategoryId(category.id);
                          }}
                          onDragLeave={() => {
                            if (dragOverCategoryId === category.id) {
                              setDragOverCategoryId(null);
                            }
                          }}
                          onDrop={(event) => handleDropOnCategory(event, category)}
                        >
                          <Button
                            variant="ghost"
                            onClick={() => handleCategoryClick(category.id)}
                            aria-pressed={isSelected}
                            size="icon"
                            className={`h-8 w-8 rounded-md text-lg transition-all duration-200 ${
                              isDragTarget
                                ? isUncategorizeHotspot
                                  ? 'bg-warning/10 text-warning outline outline-dashed outline-1 outline-warning/50'
                                  : 'bg-success/10 text-success ring-1 ring-success/40'
                                : isUncategorizeHotspot
                                  ? 'text-warning outline outline-dashed outline-1 outline-warning/50'
                                  : isSelected
                                    ? 'bg-accent text-accent-foreground font-medium'
                                    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                            }`}
                            title={category.id !== 'all' ? category.name + " — " + t('可将仓库卡片拖到这里快速改分类', 'Drag repository cards here to quickly change category') : (isUncategorizeHotspot ? t('取消分类 — 拖到这里取消仓库的分类', 'Uncategorize — drop here to remove category') : category.name)}
                            aria-label={isUncategorizeHotspot ? t('取消分类', 'Uncategorize') : category.name}
                          >
                            {isUncategorizeHotspot ? <Undo2 className="h-4 w-4" /> : category.icon}
                          </Button>
                        </div>
                      );
                    });
                  })()}
                </div>

                {/* 添加分类按钮 */}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleAddCategory}
                  className="linear-icon-button w-8 h-8 flex items-center justify-center"
                  title={t('添加分类', 'Add Category')}
                  aria-label={t('添加分类', 'Add Category')}
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            ) : (
              /* 展开状态：完整视图 */
              <div>
                {/* 头部 - 包含折叠按钮 */}
                <div className="flex items-center justify-between mb-4">
                  <h2
                      className={`text-base font-semibold text-card-foreground transition-all duration-200 ease-out ${
                      showText ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-2'
                    }`}
                  >
                    {t('应用分类', 'Categories')}
                  </h2>
                  <div className="flex items-center gap-1 pr-3">
                    <Button
                      variant="ghost"
                      onClick={handleAddCategory}
                      size="icon"
              className="h-8 w-8"
                      title={t('添加分类', 'Add Category')}
                      aria-label={t('添加分类', 'Add Category')}
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                    {/* 折叠按钮 - 放在标题栏右侧 */}
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={toggleSidebar}
                      className="h-8 w-8 rounded-md bg-muted text-muted-foreground transition-colors duration-200"
                      title={t('折叠侧栏 (Ctrl/Cmd+B)', 'Collapse Sidebar (Ctrl/Cmd+B)')}
                      aria-label={t('折叠侧栏', 'Collapse Sidebar')}
                      aria-expanded="true"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                {/* 分类列表 */}
                <div
                  ref={categoryListRef}
                  onScroll={handleCategoryScroll}
                  className={`-mr-4 max-h-[calc(100vh-12rem)] min-w-0 overflow-y-auto category-scrollbar ${isScrolling ? 'is-scrolling' : ''}`}
                >
                  <div className="space-y-1 pr-3">
                  {allCategories.map((category, index) => {
                    const count = getCategoryCount(category);
                    const isSelected = selectedCategory === category.id;
                    const isDragTarget = dragOverCategoryId === category.id;
                    // 拖拽仓库时「全部分类」变为「取消分类」拖放热区
                    const isUncategorizeHotspot = category.id === 'all' && isRepoDragging;

                    return (
                      <div
                        key={category.id}
                        className="group relative"
                        style={{
                          transitionDelay: showText ? `${Math.min(index * 30, 300)}ms` : '0ms',
                        }}
                        onDragOver={(event) => {
                          event.preventDefault();
                          setDragOverCategoryId(category.id);
                        }}
                        onDragLeave={() => {
                          if (dragOverCategoryId === category.id) {
                            setDragOverCategoryId(null);
                          }
                        }}
                        onDrop={(event) => handleDropOnCategory(event, category)}
                      >
                        <Button
                          variant="ghost"
                          onClick={() => handleCategoryClick(category.id)}
                          aria-pressed={isSelected}
                          size="sm"
                          className={`flex h-9 w-full items-center justify-between rounded-md text-left transition-[color,background-color,border-color,opacity,transform] duration-200 ease-out pr-3 ${
                            isDragTarget
                              ? isUncategorizeHotspot
                                ? 'bg-warning/10 text-warning ring-1 ring-warning/40'
                                : 'bg-success/10 text-success ring-1 ring-success/40'
                              : isUncategorizeHotspot
                                ? 'border border-dashed border-warning/50 bg-warning/5 text-warning'
                                : isSelected
                                  ? 'bg-accent text-accent-foreground font-medium'
                                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                          } ${showText ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-3'}`}
                          title={category.id !== 'all' ? category.name + " — " + t('可将仓库卡片拖到这里快速改分类', 'Drag repository cards here to quickly change category') : (isUncategorizeHotspot ? t('取消分类 — 拖到这里取消仓库的分类', 'Uncategorize — drop here to remove category') : undefined)}
                        >
                          <div className="flex items-center space-x-3 min-w-0 flex-1">
                            <span className="text-base flex-shrink-0">
                              {isUncategorizeHotspot ? <Undo2 className="h-4 w-4" /> : category.icon}
                            </span>
                            <span
                              className={`text-sm font-medium truncate transition-[opacity,transform] duration-200 ease-out ${
                                showText ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-2'
                              }`}
                            >
                              {isUncategorizeHotspot ? t('取消分类', 'Uncategorize') : category.name}
                            </span>
                          </div>

                          {/* 数字 badge - 正常状态显示，hover/focus-within 时隐藏 */}
                          <span
                              className={`ml-auto flex min-w-8 shrink-0 justify-center rounded-md px-2 py-0.5 text-xs transition-[color,background-color,border-color,opacity,transform] duration-200 ease-out ${
                              isDragTarget
                                ? isUncategorizeHotspot
                                  ? 'bg-warning/20 text-warning'
                                  : 'bg-success/20 text-success'
                                : isUncategorizeHotspot
                                  ? 'bg-warning/20 text-warning'
                                  : isSelected
                                    ? 'bg-primary text-primary-foreground'
                                    : 'bg-muted text-muted-foreground'
                            } ${showText ? 'opacity-100 scale-100' : 'opacity-0 scale-75'} group-hover:opacity-0 group-focus-within:opacity-0`}
                          >
                            {count}
                          </span>
                        </Button>

                        {/* 操作按钮 - 绝对定位，hover/focus-within 时显示，不占位 */}
                        {category.id !== 'all' && (
                          <div className="absolute right-0 top-1/2 -translate-y-1/2 flex items-center gap-1 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity pointer-events-none group-hover:pointer-events-auto group-focus-within:pointer-events-auto">
                            <Button
                              variant="ghost"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEditCategory(category);
                              }}
                              size="icon"
                              className="h-7 w-7"
                              title={t('编辑分类', 'Edit category')}
                              aria-label={t('编辑分类', 'Edit category')}
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </Button>
                            {category.isCustom ? (
                              <Button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  void handleDeleteCategory(category);
                                }}
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-muted-foreground"
                                title={t('删除分类', 'Delete category')}
                                aria-label={t('删除分类', 'Delete category')}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            ) : (
                              <Button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  void handleHideDefaultCategory(category);
                                }}
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-muted-foreground"
                                title={t('隐藏默认分类', 'Hide default category')}
                                aria-label={t('隐藏默认分类', 'Hide default category')}
                              >
                                <EyeOff className="w-3.5 h-3.5" />
                              </Button>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <CategoryEditModal
        isOpen={editModalOpen}
        onClose={handleCloseModal}
        category={editingCategory}
        isCreating={isCreatingCategory}
      />
    </>
  );
};
