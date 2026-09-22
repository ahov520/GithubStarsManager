import { Button } from './ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { X, Loader2, AlertCircle, FileText, ExternalLink, List, Type, ArrowUp, Languages, Eye, Star, GitFork, Copy, Check, Share2, Bell, BellOff, MessageSquareText, PackageOpen, MoreHorizontal, Search, ChevronUp, ChevronDown } from 'lucide-react';
import BilingualMarkdownRenderer, { DisplayMode, BilingualMarkdownRendererHandle, TranslationStatus } from './BilingualMarkdownRenderer';
import { stripMarkdownFormatting } from '../utils/markdownUtils';
import { formatDistanceToNow } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { Repository } from '../types';
import { NO_LICENSE_SENTINEL, normalizeLicense } from '../utils/licenseFilter';
import { useAppStore } from '../store/useAppStore';
import { useShallow } from 'zustand/react/shallow';
import { useReadmeFetch, pickReadmeCandidate } from '../hooks/useReadmeFetch';
import { buildReadmeVariants, DEFAULT_README_VARIANT, type ReadmeVariant } from '../utils/readmeVariants';
import { Dialog, DialogContent, DialogTitle } from './ui/dialog';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from './ui/sheet';

interface TocItem {
  id: string;
  text: string;
  level: number;
}

interface ReadmeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCloseAutoFocus?: () => void;
  repository: Repository | null;
  onAsk?: () => void;
  onOpenReleases?: () => void;
  onToggleSubscribe?: () => void;
  isSubscribed?: boolean;
}

const README_FONT_STORAGE_KEY = 'gsm:readme-font-index';

const readStoredFontIndex = (): number => {
  try {
    const parsed = Number(window.localStorage.getItem(README_FONT_STORAGE_KEY));
    if (parsed === 0 || parsed === 1 || parsed === 2) return parsed;
  } catch {
    // 隐私模式或禁用存储时保持默认字号。
  }
  return 1;
};

const formatCompactCount = (num: number): string => {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toString();
};

const repoBlurb = (repository: Repository): { text: string; source: 'custom' | 'ai' | 'github' } | null => {
  if (repository.custom_description !== undefined) {
    const text = repository.custom_description.trim();
    return text ? { text, source: 'custom' } : null;
  }
  const ai = repository.ai_summary?.trim();
  if (ai) return { text: ai, source: 'ai' };
  const github = repository.description?.trim();
  return github ? { text: github, source: 'github' } : null;
};

const escapeRegExp = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const highlightReadmeMatches = (root: HTMLElement, query: string): HTMLElement[] => {
  const needle = query.trim();
  if (!needle) return [];
  const pattern = new RegExp(escapeRegExp(needle), 'gi');
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      const parent = node.parentElement;
      if (!parent || parent.closest('script, style, mark, button, textarea, input')) return NodeFilter.FILTER_REJECT;
      pattern.lastIndex = 0;
      return pattern.test(node.nodeValue ?? '') ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
    },
  });
  const nodes: Text[] = [];
  let current = walker.nextNode();
  while (current) {
    nodes.push(current as Text);
    current = walker.nextNode();
  }
  const marks: HTMLElement[] = [];
  nodes.forEach((textNode) => {
    const text = textNode.nodeValue ?? '';
    const fragment = document.createDocumentFragment();
    let cursor = 0;
    pattern.lastIndex = 0;
    let match = pattern.exec(text);
    while (match) {
      const index = match.index;
      if (index > cursor) fragment.append(text.slice(cursor, index));
      const mark = document.createElement('mark');
      mark.dataset.readmeFind = 'true';
      mark.className = 'readme-find-mark rounded-sm bg-yellow-200 px-0.5 text-inherit dark:bg-yellow-500/40 data-[current=true]:bg-orange-300 dark:data-[current=true]:bg-orange-500/70';
      mark.textContent = match[0];
      fragment.append(mark);
      marks.push(mark);
      cursor = index + match[0].length;
      if (match[0].length === 0) pattern.lastIndex += 1;
      match = pattern.exec(text);
    }
    if (cursor < text.length) fragment.append(text.slice(cursor));
    textNode.parentNode?.replaceChild(fragment, textNode);
  });
  return marks;
};

const viewportIsCompact = (): boolean => {
  if (typeof window === 'undefined') return false;
  if (typeof window.matchMedia === 'function') return window.matchMedia('(max-width: 767px)').matches;
  return window.innerWidth < 768;
};

const RepositoryDetailSummary: React.FC<{ repository: Repository; language: 'zh' | 'en' }> = ({ repository, language }) => {
  const t = (zh: string, en: string) => (language === 'zh' ? zh : en);
  const blurb = repoBlurb(repository);
  const licenseLabel = normalizeLicense(repository.license);
  const pushedTime = Date.parse(repository.pushed_at);
  const pushedLabel = Number.isNaN(pushedTime)
    ? null
    : formatDistanceToNow(pushedTime, { addSuffix: true, locale: language === 'zh' ? zhCN : undefined });
  const topics = (repository.topics ?? []).slice(0, 8);

  return (
    <div className="space-y-2 px-3 pb-2 md:px-4">
      {blurb && (
        <p className="line-clamp-3 text-sm leading-6 text-muted-foreground">
          {blurb.source === 'ai' && (
            <span className="mr-1.5 inline-flex rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
              AI
            </span>
          )}
          {blurb.text}
        </p>
      )}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1" title={t('星标', 'Stars')}>
          <Star className="h-3.5 w-3.5" aria-hidden="true" />
          {formatCompactCount(repository.stargazers_count)}
          <span className="sr-only">{t('星标', 'Stars')}</span>
        </span>
        <span className="inline-flex items-center gap-1" title={t('复刻', 'Forks')}>
          <GitFork className="h-3.5 w-3.5" aria-hidden="true" />
          {formatCompactCount(repository.forks_count)}
          <span className="sr-only">{t('复刻', 'Forks')}</span>
        </span>
        {repository.language && <span>{repository.language}</span>}
        {licenseLabel !== NO_LICENSE_SENTINEL && <span>{licenseLabel}</span>}
        {pushedLabel && <span>{t(`更新于 ${pushedLabel}`, `Updated ${pushedLabel}`)}</span>}
      </div>
      {topics.length > 0 && (
        <div className="flex gap-1.5 overflow-x-auto pb-0.5 scrollbar-hide">
          {topics.map((topic) => (
            <span key={topic} className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
              {topic}
            </span>
          ))}
        </div>
      )}
    </div>
  );
};

const FONT_SIZES = [
  { label: '小', labelEn: 'Small', value: 'text-sm' },
  { label: '中', labelEn: 'Medium', value: 'text-base' },
  { label: '大', labelEn: 'Large', value: 'text-lg' },
];

const TOC_MAX_LEVEL = 6;

const getDefaultReadmeVariant = (language: 'zh' | 'en'): ReadmeVariant => ({
  ...DEFAULT_README_VARIANT,
  label: language === 'zh' ? '默认 README' : 'Default README',
});

const isAbortError = (error: unknown, signal?: AbortSignal): boolean => {
  return Boolean(signal?.aborted || (error as { name?: string })?.name === 'AbortError');
};

export const ReadmeModal: React.FC<ReadmeModalProps> = ({
  isOpen,
  onClose,
  onCloseAutoFocus,
  repository,
  onAsk,
  onOpenReleases,
  onToggleSubscribe,
  isSubscribed = false,
}) => {
  const { language, setReadmeModalOpen } = useAppStore(useShallow((state) => ({
    language: state.language,
    setReadmeModalOpen: state.setReadmeModalOpen,
  })));
  const [readmeContent, setReadmeContent] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showToc, setShowToc] = useState(() => (typeof window !== 'undefined' ? window.innerWidth >= 768 : true));
  const [fontSizeIndex, setFontSizeIndex] = useState(readStoredFontIndex);
  const [tocItems, setTocItems] = useState<TocItem[]>([]);
  const [headingIdMap, setHeadingIdMap] = useState<Map<string, string>>(new Map());
  const [scrollProgress, setScrollProgress] = useState(0);
  const [showBackToTop, setShowBackToTop] = useState(false);
  const [activeHeadingId, setActiveHeadingId] = useState<string | null>(null);
  const [displayMode, setDisplayMode] = useState<DisplayMode>('bilingual');
  const [errorExpanded, setErrorExpanded] = useState(false);
  const [tocWidth, setTocWidth] = useState(224);
  const [translatedHeadingMap, setTranslatedHeadingMap] = useState<Map<string, string>>(new Map());
  const [readmeVariants, setReadmeVariants] = useState<ReadmeVariant[]>(() => [getDefaultReadmeVariant(language)]);
  const [selectedReadmeKey, setSelectedReadmeKey] = useState('default');
  const [variantsLoading, setVariantsLoading] = useState(false);
  const [readmeCache, setReadmeCache] = useState<Record<string, string>>({});
  const [isCompact, setIsCompact] = useState(viewportIsCompact);
  const [moreActionsOpen, setMoreActionsOpen] = useState(false);
  const [canNativeShare, setCanNativeShare] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const [cloneCopied, setCloneCopied] = useState(false);
  const [findOpen, setFindOpen] = useState(false);
  const [findQuery, setFindQuery] = useState('');
  const [findIndex, setFindIndex] = useState(0);
  const [findCount, setFindCount] = useState(0);
  const copyResetRef = useRef<number | null>(null);
  const cloneResetRef = useRef<number | null>(null);
  const findInputRef = useRef<HTMLInputElement>(null);

  const defaultReadmeVariant = useMemo(() => getDefaultReadmeVariant(language), [language]);

  const contentRef = useRef<HTMLDivElement>(null);
  const isResizingRef = useRef(false);
  const startXRef = useRef(0);
  const startWidthRef = useRef(0);

  // README 抓取（backend 优先 → GitHub 兜底）由共享 hook 承担；
  // abort 实体在 hook（每次 fetch 前中止上一个，unmount 自动取消），关闭 modal 时调 cancelFetches。
  const [repoOwner = '', repoName = ''] = repository?.full_name.split('/') ?? [];
  const {
    fetchReadmeContent: fetchReadmeContentFromAvailableSource,
    fetchReadmeCandidates: fetchReadmeCandidatesFromAvailableSource,
    cancel: cancelFetches,
  } = useReadmeFetch({ owner: repoOwner, name: repoName });

  const bilingualRef = useRef<BilingualMarkdownRendererHandle>(null);
  const [translateStatus, setTranslateStatus] = useState<TranslationStatus>('idle');
  const [translateProgress, setTranslateProgress] = useState({ current: 0, total: 0 });
  const [translateError, setTranslateError] = useState<string | null>(null);

  const displayContent = readmeContent;

  const currentFontSize = FONT_SIZES[fontSizeIndex].value;

  const getFontSizeType = useCallback((): 'small' | 'medium' | 'large' => {
    switch (fontSizeIndex) {
      case 0:
        return 'small';
      case 2:
        return 'large';
      case 1:
      default:
        return 'medium';
    }
  }, [fontSizeIndex]);

  const extractToc = useCallback((content: string): { items: TocItem[], idMap: Map<string, string> } => {
    const items: TocItem[] = [];
    const idMap = new Map<string, string>();

    const codeBlockRegex = /```[\s\S]*?```|~~~[\s\S]*?~~~/g;
    const cleanedContent = content.replace(codeBlockRegex, '');
    const regex = new RegExp(`^(#{1,${TOC_MAX_LEVEL}})\\s+(.+)$`, 'gm');
    let match;
    let idCounter = 0;
    const textCountMap = new Map<string, number>();

    while ((match = regex.exec(cleanedContent)) !== null) {
      const level = match[1].length;
      const rawText = match[2].trim();
      const displayText = stripMarkdownFormatting(rawText);
      const id = `heading-${idCounter++}`;
      const count = textCountMap.get(displayText) || 0;
      const mapKey = count === 0 ? displayText : `${displayText}__${count}`;
      textCountMap.set(displayText, count + 1);
      items.push({ id, text: displayText, level });
      idMap.set(mapKey, id);
    }

    return { items, idMap };
  }, []);

  const scrollToHeading = useCallback((id: string, fallbackText?: string) => {
    if (!contentRef.current) return;
    const container = contentRef.current;

    const translationWrapper = container.querySelector(`[data-bi-heading-id="${CSS.escape(id)}"]`) as HTMLElement | null;
    if (translationWrapper && translationWrapper.offsetParent !== null) {
      const elementRect = translationWrapper.getBoundingClientRect();
      const containerRect = container.getBoundingClientRect();
      const scrollTop = container.scrollTop + elementRect.top - containerRect.top - 20;
      try {
        container.scrollTo({ top: scrollTop, behavior: 'smooth' });
      } catch {
        container.scrollTop = scrollTop;
      }
      return;
    }

    let element = container.querySelector(`#${CSS.escape(id)}`) as HTMLElement | null;

    if (!element && fallbackText) {
      const headings = container.querySelectorAll('h1, h2, h3, h4, h5, h6');
      for (let i = 0; i < headings.length; i++) {
        const heading = headings[i] as HTMLElement;
        if (heading.textContent?.trim() === fallbackText.trim()) {
          element = heading;
          break;
        }
      }
    }

    if (!element && fallbackText) {
      const headings = container.querySelectorAll('h1, h2, h3, h4, h5, h6');
      for (let i = 0; i < headings.length; i++) {
        const heading = headings[i] as HTMLElement;
        if (heading.textContent?.includes(fallbackText)) {
          element = heading;
          break;
        }
      }
    }

    if (element) {
      const elementRect = element.getBoundingClientRect();
      const containerRect = container.getBoundingClientRect();
      const scrollTop = container.scrollTop + elementRect.top - containerRect.top - 20;

      try {
        container.scrollTo({
          top: scrollTop,
          behavior: 'smooth'
        });
      } catch {
        container.scrollTop = scrollTop;
      }
    }
  }, []);

  const handleScroll = useCallback(() => {
    if (!contentRef.current) return;
    const container = contentRef.current;
    const { scrollTop, scrollHeight, clientHeight } = container;
    const progress = scrollHeight <= clientHeight ? 0 : (scrollTop / (scrollHeight - clientHeight)) * 100;
    setScrollProgress(Math.min(100, Math.max(0, progress)));
    setShowBackToTop(scrollTop > 300);
    if (!repository) return;
    try {
      sessionStorage.setItem(`gsm:readme-scroll:${repository.id}:${selectedReadmeKey}`, String(Math.round(scrollTop)));
    } catch {
      // 存储不可用时仍允许阅读，只是不记住位置。
    }
  }, [repository, selectedReadmeKey]);

  useEffect(() => {
    if (!contentRef.current || !tocItems.length || !readmeContent) return;

    let observer: IntersectionObserver | null = null;

    const timer = setTimeout(() => {
      const container = contentRef.current;
      if (!container) return;

      if (observer) observer.disconnect();

      observer = new IntersectionObserver(
        (entries) => {
          const visibleEntries = entries.filter(e => e.isIntersecting);
          if (visibleEntries.length > 0) {
            const topEntry = visibleEntries.reduce((a, b) =>
              a.boundingClientRect.top < b.boundingClientRect.top ? a : b
            );
            const target = topEntry.target as HTMLElement;
            setActiveHeadingId(target.dataset.biHeadingId ?? target.id);
          }
        },
        {
          root: container,
          rootMargin: '-10% 0px -80% 0px',
          threshold: 0,
        }
      );

      tocItems.forEach((item) => {
        let el = container.querySelector(`[data-bi-heading-id="${CSS.escape(item.id)}"]`) as HTMLElement | null;
        if (!el) {
          el = container.querySelector(`#${CSS.escape(item.id)}`);
        }
        if (!el && item.text) {
          const headings = container.querySelectorAll('h1, h2, h3, h4, h5, h6');
          for (let i = 0; i < headings.length; i++) {
            const heading = headings[i] as HTMLElement;
            if (heading.textContent?.trim() === item.text.trim()) {
              el = heading;
              break;
            }
          }
        }
        if (el && observer) observer.observe(el);
      });
    }, 150);

    return () => {
      clearTimeout(timer);
      if (observer) observer.disconnect();
    };
  }, [tocItems, readmeContent, translateStatus, displayMode]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizingRef.current) return;
      const delta = e.clientX - startXRef.current;
      setTocWidth(Math.max(150, Math.min(500, startWidthRef.current + delta)));
    };
    const handleMouseUp = () => {
      if (!isResizingRef.current) return;
      isResizingRef.current = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  const scrollToTop = useCallback(() => {
    if (contentRef.current) {
      try {
        contentRef.current.scrollTo({ top: 0, behavior: 'smooth' });
      } catch {
        contentRef.current.scrollTop = 0;
      }
    }
  }, []);

  const cycleFontSize = useCallback(() => {
    setFontSizeIndex((prev) => (prev + 1) % FONT_SIZES.length);
  }, []);

  const handleResizeMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    isResizingRef.current = true;
    startXRef.current = e.clientX;
    startWidthRef.current = tocWidth;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  }, [tocWidth]);

  const t = useCallback((zh: string, en: string) => language === 'zh' ? zh : en, [language]);

  const handleTranslate = useCallback(async () => {
    if (translateStatus === 'translating') return;
    await bilingualRef.current?.translate();
  }, [translateStatus]);

  const handleRevertTranslation = useCallback(() => {
    bilingualRef.current?.revert();
    setTranslatedHeadingMap(new Map());
  }, []);

  const handleHeadingsTranslated = useCallback((headings: { id: string; text: string }[]) => {
    const map = new Map<string, string>();
    headings.forEach(h => map.set(h.id, h.text));
    setTranslatedHeadingMap(map);
  }, []);

  const resetTranslationState = useCallback(() => {
    bilingualRef.current?.revert();
    setDisplayMode('bilingual');
    setTranslateStatus('idle');
    setTranslateProgress({ current: 0, total: 0 });
    setTranslateError(null);
    setTranslatedHeadingMap(new Map());
  }, []);

  const resetReadmeViewState = useCallback(() => {
    resetTranslationState();
    setTocItems([]);
    setHeadingIdMap(new Map());
    setActiveHeadingId(null);
    setScrollProgress(0);
    setShowBackToTop(false);
    scrollToTop();
  }, [resetTranslationState, scrollToTop]);

  const fetchReadmeContent = useCallback(async (variant: ReadmeVariant) => {
    if (!repository) return;

    setLoading(true);
    setError(null);

    try {
      const content = await fetchReadmeContentFromAvailableSource(variant);

      setReadmeCache(prev => ({ ...prev, [variant.key]: content }));

      if (content.trim()) {
        setReadmeContent(content);
        setError(null);
      } else {
        setReadmeContent('');
        setError(variant.isDefault
          ? (language === 'zh' ? '该仓库没有 README 文件' : 'This repository has no README file')
          : (language === 'zh' ? '该 README 文件为空' : 'This README file is empty'));
      }
      setLoading(false);
    } catch (err) {
      // 被 hook abort（被新请求取代 / cancel）时静默返回，不动 loading 态
      if (isAbortError(err)) return;
      console.error('Failed to fetch README:', err);
      setReadmeContent('');
      const fallbackMessage = variant.isDefault
        ? (language === 'zh' ? '加载 README 失败，请检查网络连接或稍后重试' : 'Failed to load README. Please check your network connection and try again later')
        : (language === 'zh' ? '加载所选 README 失败，请稍后重试' : 'Failed to load selected README. Please try again later');
      setError(err instanceof Error && err.message ? err.message : fallbackMessage);
      setLoading(false);
    }
  }, [repository, fetchReadmeContentFromAvailableSource, language]);

  const fetchReadmeVariants = useCallback(async () => {
    if (!repository) return;

    setVariantsLoading(true);

    try {
      const defaultBranch = (repository as Repository & { default_branch?: string }).default_branch;
      const candidates = await fetchReadmeCandidatesFromAvailableSource(defaultBranch);

      setReadmeVariants(buildReadmeVariants(candidates, language));
      setVariantsLoading(false);
    } catch (err) {
      if (isAbortError(err)) return;
      console.warn('Failed to detect README variants:', err);
      setReadmeVariants([defaultReadmeVariant]);
      setVariantsLoading(false);
    }
  }, [repository, fetchReadmeCandidatesFromAvailableSource, language, defaultReadmeVariant]);

  const fetchReadme = useCallback(async () => {
    await fetchReadmeContent(pickReadmeCandidate(readmeVariants, selectedReadmeKey, defaultReadmeVariant));
  }, [readmeVariants, selectedReadmeKey, defaultReadmeVariant, fetchReadmeContent]);

  const handleReadmeVariantChange = useCallback((nextKey: string) => {
    if (nextKey === selectedReadmeKey) return;

    const nextVariant = readmeVariants.find(variant => variant.key === nextKey);
    if (!nextVariant) return;

    setSelectedReadmeKey(nextKey);
    resetReadmeViewState();

    const cachedContent = readmeCache[nextKey];
    if (cachedContent !== undefined) {
      setReadmeContent(cachedContent);
      setError(cachedContent.trim()
        ? null
        : nextVariant.isDefault
          ? (language === 'zh' ? '该仓库没有 README 文件' : 'This repository has no README file')
          : (language === 'zh' ? '该 README 文件为空' : 'This README file is empty'));
      return;
    }

    void fetchReadmeContent(nextVariant);
  }, [selectedReadmeKey, readmeVariants, readmeCache, resetReadmeViewState, language, fetchReadmeContent]);

  useEffect(() => {
    if (isOpen && repository) {
      const defaultVariant = getDefaultReadmeVariant(language);
      setReadmeVariants([defaultVariant]);
      setSelectedReadmeKey('default');
      setReadmeCache({});
      resetReadmeViewState();
      void fetchReadmeContent(defaultVariant);
      void fetchReadmeVariants();
    }
  }, [isOpen, repository, language, fetchReadmeContent, fetchReadmeVariants, resetReadmeViewState]);

  useEffect(() => {
    if (displayContent) {
      const { items, idMap } = extractToc(displayContent);
      setTocItems(items);
      setHeadingIdMap(idMap);
      setTranslatedHeadingMap(new Map());
    }
  }, [displayContent, extractToc]);

  useEffect(() => {
    setReadmeModalOpen(isOpen);
    return () => setReadmeModalOpen(false);
  }, [isOpen, setReadmeModalOpen]);

  useEffect(() => {
    if (!isOpen) {
      cancelFetches();
      setReadmeContent('');
      setError(null);
      setLoading(false);
      setReadmeVariants([getDefaultReadmeVariant(language)]);
      setSelectedReadmeKey('default');
      setVariantsLoading(false);
      setReadmeCache({});
      setTocItems([]);
      setHeadingIdMap(new Map());
      setScrollProgress(0);
      setShowBackToTop(false);
      setActiveHeadingId(null);
      setDisplayMode('bilingual');
      setErrorExpanded(false);
      bilingualRef.current?.revert();
      setTranslateStatus('idle');
      setTranslateProgress({ current: 0, total: 0 });
      setTranslateError(null);
      setTranslatedHeadingMap(new Map());
      setMoreActionsOpen(false);
      setFindOpen(false);
      setFindQuery('');
      setFindIndex(0);
      setFindCount(0);
      setLinkCopied(false);
      setCloneCopied(false);
      isResizingRef.current = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    } else {
      setShowToc(!viewportIsCompact());
    }
  }, [isOpen, language, cancelFetches]);

  useEffect(() => {
    try {
      window.localStorage.setItem(README_FONT_STORAGE_KEY, String(fontSizeIndex));
    } catch {
      // 字号记忆失败不影响阅读。
    }
  }, [fontSizeIndex]);

  useEffect(() => {
    setCanNativeShare(typeof navigator.share === 'function');
    const media = typeof window.matchMedia === 'function' ? window.matchMedia('(max-width: 767px)') : null;
    if (!media || typeof media.addEventListener !== 'function') return undefined;
    const onChange = () => setIsCompact(media.matches);
    onChange();
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, []);

  useEffect(() => () => {
    if (copyResetRef.current) window.clearTimeout(copyResetRef.current);
    if (cloneResetRef.current) window.clearTimeout(cloneResetRef.current);
  }, []);

  useEffect(() => {
    if (!isOpen || !repository || loading || !readmeContent || !contentRef.current) return;
    let saved = 0;
    try {
      saved = Number(sessionStorage.getItem(`gsm:readme-scroll:${repository.id}:${selectedReadmeKey}`) || '0');
    } catch {
      saved = 0;
    }
    if (saved > 0) contentRef.current.scrollTop = saved;
  }, [isOpen, repository, loading, readmeContent, selectedReadmeKey]);

  const clearFindMarks = useCallback(() => {
    const root = contentRef.current;
    if (!root) return;
    root.querySelectorAll('mark[data-readme-find]').forEach((mark) => {
      const parent = mark.parentNode;
      if (!parent) return;
      while (mark.firstChild) parent.insertBefore(mark.firstChild, mark);
      parent.removeChild(mark);
      parent.normalize();
    });
  }, []);

  useEffect(() => {
    if (!findOpen || !readmeContent || loading || !contentRef.current) {
      clearFindMarks();
      setFindCount((current) => (current === 0 ? current : 0));
      return;
    }
    clearFindMarks();
    const marks = highlightReadmeMatches(contentRef.current, findQuery);
    marks.forEach((mark, index) => {
      if (index === findIndex) mark.dataset.current = 'true';
    });
    const active = marks[findIndex];
    if (active && findQuery.trim()) {
      try {
        active.scrollIntoView({ block: 'center', inline: 'nearest' });
      } catch {
        // 测试环境没有布局，滚动失败不影响高亮。
      }
    }
    setFindCount((current) => (current === marks.length ? current : marks.length));
    if (marks.length > 0 && findIndex > marks.length - 1) setFindIndex(marks.length - 1);
  }, [findOpen, findQuery, findIndex, findCount, readmeContent, displayMode, loading, clearFindMarks]);

  useEffect(() => {
    if (!findOpen) return undefined;
    const frame = window.requestAnimationFrame(() => findInputRef.current?.focus());
    return () => window.cancelAnimationFrame(frame);
  }, [findOpen]);

  const stepFind = (delta: number) => {
    setFindIndex((current) => {
      if (findCount <= 0) return 0;
      return (current + delta + findCount) % findCount;
    });
  };

  const copyLink = useCallback(async () => {
    if (!repository) return;
    try {
      await navigator.clipboard.writeText(repository.html_url);
      setLinkCopied(true);
      if (copyResetRef.current) window.clearTimeout(copyResetRef.current);
      copyResetRef.current = window.setTimeout(() => setLinkCopied(false), 1600);
    } catch {
      setLinkCopied(false);
    }
  }, [repository]);

  const copyClone = useCallback(async () => {
    if (!repository) return;
    try {
      await navigator.clipboard.writeText(`git clone ${repository.html_url}.git`);
      setCloneCopied(true);
      if (cloneResetRef.current) window.clearTimeout(cloneResetRef.current);
      cloneResetRef.current = window.setTimeout(() => setCloneCopied(false), 1600);
    } catch {
      setCloneCopied(false);
    }
  }, [repository]);

  const shareRepository = useCallback(async () => {
    if (!repository) return;
    if (typeof navigator.share === 'function') {
      try {
        await navigator.share({
          title: repository.full_name,
          text: repository.description || repository.full_name,
          url: repository.html_url,
        });
        return;
      } catch (error) {
        if ((error as { name?: string }).name === 'AbortError') return;
      }
    }
    await copyLink();
  }, [copyLink, repository]);

  if (!repository) return null;

  const tocIndentClass = (level: number): string => {
    switch (level) {
      case 1: return '';
      case 2: return 'pl-3';
      case 3: return 'pl-6';
      case 4: return 'pl-9';
      case 5: return 'pl-12';
      case 6: return 'pl-16';
      default: return '';
    }
  };

  const tocTextClass = (level: number): string => {
    if (level <= 2) return 'font-medium text-foreground dark:text-muted-foreground';
    if (level <= 4) return 'text-muted-foreground dark:text-muted-foreground';
    return 'text-muted-foreground dark:text-muted-foreground text-xs';
  };

  const isTranslating = translateStatus === 'translating';
  const isTranslated = translateStatus === 'translated';
  const isTranslateError = translateStatus === 'error';
  const currentReadmeVariant = pickReadmeCandidate(readmeVariants, selectedReadmeKey, defaultReadmeVariant);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        showClose={false}
        aria-describedby={undefined}
        className="repo-detail-dialog min-w-0"
        onCloseAutoFocus={(event) => {
          if (!onCloseAutoFocus) return;
          event.preventDefault();
          onCloseAutoFocus();
        }}
      >
        <div className="relative flex h-full min-h-0 w-full min-w-0 flex-col overflow-hidden bg-card dark:bg-card">
          {readmeContent && !loading && (
            <div className="absolute top-0 left-0 right-0 h-0.5 bg-accent dark:bg-muted z-20 rounded-t-xl overflow-hidden">
              <div
                className="h-full bg-primary transition-[width] duration-150 ease-out"
                style={{ width: `${scrollProgress}%` }}
              />
            </div>
          )}

          <header className="shrink-0 border-b border-border pt-safe dark:border-border">
            <div className="flex items-center gap-2 px-3 py-2 md:px-4">
              <img
                src={repository.owner.avatar_url}
                alt={repository.owner.login}
                className="h-8 w-8 shrink-0 rounded-full"
              />
              <div className="min-w-0 flex-1">
                <DialogTitle className="truncate text-base font-semibold text-foreground md:text-lg dark:text-foreground">
                  {repository.full_name}
                </DialogTitle>
                <p className="truncate text-xs text-muted-foreground dark:text-muted-foreground" title={currentReadmeVariant.path || 'README'}>
                  {currentReadmeVariant.isDefault ? 'README' : currentReadmeVariant.path}
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="touch-target-44 h-9 w-9 shrink-0 rounded-lg p-0 text-muted-foreground hover:bg-muted hover:text-foreground"
                aria-label={t('关闭', 'Close')}
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
            <RepositoryDetailSummary repository={repository} language={language} />
            <div className="flex max-w-full flex-wrap items-center gap-1 px-2 pb-2 sm:flex-nowrap sm:overflow-x-auto scrollbar-hide">
              {readmeVariants.length > 1 && (
                <Select value={selectedReadmeKey} onValueChange={handleReadmeVariantChange} disabled={loading || variantsLoading}>
                  <SelectTrigger className="h-11 w-auto min-w-[7rem] max-w-[220px] shrink-0 px-2 text-sm sm:h-9" title={t('切换 README 语言', 'Switch README language')} aria-label={t('切换 README 语言', 'Switch README language')}><SelectValue /></SelectTrigger>
                  <SelectContent>{readmeVariants.map((variant) => <SelectItem key={variant.key} value={variant.key}>{variant.label}</SelectItem>)}</SelectContent>
                </Select>
              )}
              {readmeContent && !loading && (
                isTranslated ? (
                  <>
                    <Button
                      variant="ghost"
                      onClick={handleRevertTranslation}
                      aria-label={t('关闭翻译', 'Close Translation')}
                      className="touch-target-44 flex h-11 shrink-0 items-center gap-1 rounded-lg bg-primary/20 px-2.5 text-sm text-primary transition-colors sm:h-8 dark:bg-primary/10 dark:text-primary"
                      title={t('关闭翻译', 'Close Translation')}
                    >
                      <Languages className="w-4 h-4" />
                      <span>{t('已翻译', 'Translated')}</span>
                    </Button>
                    {([
                      { mode: 'original' as DisplayMode, icon: FileText, label: t('原文', 'Original') },
                      { mode: 'translated' as DisplayMode, icon: Languages, label: t('译文', 'Translated') },
                      { mode: 'bilingual' as DisplayMode, icon: Eye, label: t('双语', 'Bilingual') },
                    ]).map(({ mode, icon: Icon, label }) => (
                      <Button
                        key={mode}
                        variant="ghost"
                        onClick={() => setDisplayMode(mode)}
                        aria-label={label}
                        className={`touch-target-44 flex h-11 shrink-0 items-center gap-1 rounded-lg px-2.5 text-sm transition-colors sm:h-8 ${
                          displayMode === mode
                            ? 'bg-primary/20 text-primary dark:bg-primary/10 dark:text-primary'
                            : 'text-muted-foreground hover:text-muted-foreground dark:hover:text-muted-foreground hover:bg-muted dark:hover:bg-card'
                        }`}
                        title={label}
                      >
                        <Icon className="w-4 h-4" />
                        <span>{label}</span>
                      </Button>
                    ))}
                  </>
                ) : isTranslateError ? (
                  <>
                    <Button
                      variant="ghost"
                      onClick={handleTranslate}
                      aria-label={t('重试翻译', 'Retry Translation')}
                      className="touch-target-44 flex h-11 shrink-0 items-center gap-1 rounded-lg px-2.5 text-sm text-warning transition-colors hover:bg-warning/10 sm:h-8"
                      title={t('重试翻译', 'Retry Translation')}
                    >
                      <Languages className="w-4 h-4" />
                      <span>{t('重试', 'Retry')}</span>
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={handleRevertTranslation}
                      aria-label={t('关闭翻译', 'Close Translation')}
                      className="touch-target-44 flex h-11 w-11 shrink-0 items-center justify-center rounded-lg p-0 text-muted-foreground transition-colors hover:bg-muted sm:h-8 sm:w-8 dark:hover:bg-card"
                      title={t('关闭翻译', 'Close Translation')}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </>
                ) : (
                  <Button
                    variant="ghost"
                    onClick={handleTranslate}
                    disabled={isTranslating}
                    aria-label={t('翻译文档', 'Translate Document')}
                    className={`touch-target-44 flex h-11 shrink-0 items-center gap-1 rounded-lg px-2.5 text-sm transition-colors sm:h-8 ${
                      isTranslating
                        ? 'text-muted-foreground dark:text-muted-foreground/70 cursor-not-allowed'
                        : 'text-muted-foreground dark:text-foreground hover:text-foreground hover:bg-muted dark:hover:bg-accent'
                    }`}
                    title={t('翻译文档', 'Translate Document')}
                  >
                    {isTranslating ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span className="hidden sm:inline">
                          {translateProgress.total > 0 
                            ? `${translateProgress.current}/${translateProgress.total}` 
                            : t('翻译中…', 'Translating…')}
                        </span>
                      </>
                    ) : (
                      <>
                        <Languages className="w-4 h-4" />
                        <span className="sm:hidden">{t('翻译', 'Translate')}</span>
                        <span className="hidden sm:inline">{language === 'zh' ? t('翻译为中文', 'Translate to Chinese') : t('翻译为英文', 'Translate to English')}</span>
                      </>
                    )}
                  </Button>
                )
              )}
              {readmeContent && !loading && (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setFindOpen(true)}
                  aria-pressed={findOpen}
                  aria-label={t('查找', 'Find')}
                  className={`touch-target-44 h-11 shrink-0 gap-1 rounded-lg px-2.5 sm:h-8 sm:px-2 ${
                    findOpen ? 'bg-primary/20 text-primary' : 'text-muted-foreground'
                  }`}
                >
                  <Search className="h-4 w-4" />
                  <span className="sm:hidden">{t('查找', 'Find')}</span>
                </Button>
              )}
              {isCompact ? (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setMoreActionsOpen(true)}
                  aria-expanded={moreActionsOpen}
                  aria-label={t('更多操作', 'More actions')}
                  className="touch-target-44 h-11 shrink-0 gap-1 rounded-lg px-2.5 text-muted-foreground"
                >
                  <MoreHorizontal className="h-4 w-4" />
                  <span>{t('更多', 'More')}</span>
                </Button>
              ) : (
                <>
              {tocItems.length > 0 && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowToc(!showToc)}
                  aria-label={t('目录', 'Table of Contents')}
                  className={`touch-target-44 sm:h-8 sm:w-8 h-9 w-9 rounded-lg p-0 transition-colors ${
                    showToc
                      ? 'bg-primary/20 text-primary dark:bg-primary/10 dark:text-primary'
                      : 'text-muted-foreground hover:text-muted-foreground dark:hover:text-foreground hover:bg-muted dark:hover:bg-accent'
                  }`}
                  title={t('目录', 'Table of Contents')}
                >
                  <List className="w-4 h-4" />
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon"
                aria-label={t(`字体大小: ${FONT_SIZES[fontSizeIndex].label}`, `Font Size: ${FONT_SIZES[fontSizeIndex].labelEn}`)}
                onClick={cycleFontSize}
                className="touch-target-44 sm:h-8 sm:w-8 h-9 w-9 rounded-lg p-0 text-muted-foreground dark:text-foreground hover:text-foreground dark:hover:text-foreground hover:bg-muted dark:hover:bg-accent transition-colors"
                title={t(`字体大小: ${FONT_SIZES[fontSizeIndex].label}`, `Font Size: ${FONT_SIZES[fontSizeIndex].labelEn}`)}
              >
                <Type className="w-4 h-4" />
              </Button>
              {onAsk && (
                <Button type="button" variant="ghost" onClick={onAsk} className="touch-target-44 h-9 shrink-0 gap-1 rounded-lg px-2.5 text-muted-foreground sm:h-8" aria-label={t('问答此仓库', 'Ask this repository')} title={t('问答此仓库', 'Ask this repository')}>
                  <MessageSquareText className="h-4 w-4" />
                  <span className="hidden sm:inline">{t('问答', 'Ask')}</span>
                </Button>
              )}
              {onOpenReleases && (
                <Button type="button" variant="ghost" onClick={onOpenReleases} className="touch-target-44 h-9 shrink-0 gap-1 rounded-lg px-2.5 text-muted-foreground sm:h-8" aria-label={t('查看 Release', 'View releases')} title={t('查看 Release', 'View releases')}>
                  <PackageOpen className="h-4 w-4" />
                  <span className="hidden sm:inline">Release</span>
                </Button>
              )}
              {onToggleSubscribe && (
                <Button type="button" variant="ghost" onClick={onToggleSubscribe} aria-pressed={isSubscribed} className="touch-target-44 h-9 shrink-0 gap-1 rounded-lg px-2.5 text-muted-foreground sm:h-8" aria-label={isSubscribed ? t('取消订阅 Release', 'Unsubscribe from releases') : t('订阅 Release', 'Subscribe to releases')} title={isSubscribed ? t('取消订阅 Release', 'Unsubscribe from releases') : t('订阅 Release', 'Subscribe to releases')}>
                  {isSubscribed ? <Bell className="h-4 w-4" /> : <BellOff className="h-4 w-4" />}
                  <span className="hidden sm:inline">{isSubscribed ? t('已订阅', 'Subscribed') : t('订阅', 'Subscribe')}</span>
                </Button>
              )}
              <Button type="button" variant="ghost" onClick={() => void copyLink()} className="touch-target-44 h-9 shrink-0 gap-1 rounded-lg px-2.5 text-muted-foreground sm:h-8" aria-label={linkCopied ? t('已复制', 'Copied') : t('复制链接', 'Copy link')} title={linkCopied ? t('已复制', 'Copied') : t('复制链接', 'Copy link')}>
                {linkCopied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                <span className="hidden sm:inline">{linkCopied ? t('已复制', 'Copied') : t('复制链接', 'Copy link')}</span>
              </Button>
              <Button type="button" variant="ghost" onClick={() => void copyClone()} className="touch-target-44 h-9 shrink-0 gap-1 rounded-lg px-2.5 text-muted-foreground sm:h-8" aria-label={cloneCopied ? t('已复制克隆命令', 'Clone command copied') : t('复制克隆命令', 'Copy clone command')} title={cloneCopied ? t('已复制克隆命令', 'Clone command copied') : t('复制克隆命令', 'Copy clone command')}>
                {cloneCopied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                <span className="hidden sm:inline">{cloneCopied ? t('已复制克隆命令', 'Clone command copied') : t('复制克隆命令', 'Copy clone command')}</span>
              </Button>
              {canNativeShare && (
                <Button type="button" variant="ghost" onClick={() => void shareRepository()} className="touch-target-44 h-9 shrink-0 gap-1 rounded-lg px-2.5 text-muted-foreground sm:h-8" aria-label={t('分享', 'Share')} title={t('分享', 'Share')}>
                  <Share2 className="h-4 w-4" />
                  <span className="hidden sm:inline">{t('分享', 'Share')}</span>
                </Button>
              )}
              <a
                href={repository.html_url}
                target="_blank"
                rel="noopener noreferrer"
                className="touch-target-44 inline-flex h-9 shrink-0 items-center gap-1 rounded-lg px-2.5 text-sm text-muted-foreground hover:bg-muted hover:text-foreground sm:h-8"
                title={t('在 GitHub 上查看', 'View on GitHub')}
                aria-label={t('在 GitHub 上查看', 'View on GitHub')}
              >
                <ExternalLink className="h-4 w-4" />
                <span className="hidden sm:inline">{t('在 GitHub 上查看', 'View on GitHub')}</span>
              </a>
                </>
              )}
            </div>
            {translateError && (
              <button
                type="button"
                className={`mx-3 mb-2 block max-w-full rounded-lg bg-destructive/10 px-3 py-1 text-left text-xs text-destructive ${errorExpanded ? 'whitespace-normal break-all' : 'truncate'}`}
                onClick={() => setErrorExpanded(!errorExpanded)}
                title={!errorExpanded ? translateError : undefined}
              >
                {translateError}
              </button>
            )}
          </header>

          {findOpen && readmeContent && !loading && (
            <div className="flex w-full min-w-0 shrink-0 flex-wrap items-center gap-1 border-b border-border px-2 py-2">
              <input
                ref={findInputRef}
                value={findQuery}
                onChange={(event) => {
                  setFindQuery(event.target.value);
                  setFindIndex(0);
                }}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault();
                    stepFind(event.shiftKey ? -1 : 1);
                  } else if (event.key === 'Escape') {
                    event.preventDefault();
                    setFindOpen(false);
                  }
                }}
                aria-label={t('在 README 中查找', 'Find in README')}
                placeholder={t('查找', 'Find')}
                enterKeyHint="search"
                className="h-11 min-w-[8rem] flex-1 rounded-lg border border-border bg-background px-3 text-base text-foreground"
              />
              <span className="shrink-0 px-1 text-center text-xs tabular-nums text-muted-foreground" aria-live="polite">
                {findQuery.trim() ? (findCount > 0 ? `${findIndex + 1}/${findCount}` : t('无匹配', 'No matches')) : ''}
              </span>
              <Button type="button" variant="ghost" aria-label={t('上一处', 'Previous match')} className="touch-target-44 h-11 w-11 shrink-0 p-0" onClick={() => stepFind(-1)} disabled={findCount === 0}>
                <ChevronUp className="h-4 w-4" />
              </Button>
              <Button type="button" variant="ghost" aria-label={t('下一处', 'Next match')} className="touch-target-44 h-11 w-11 shrink-0 p-0" onClick={() => stepFind(1)} disabled={findCount === 0}>
                <ChevronDown className="h-4 w-4" />
              </Button>
              <Button type="button" variant="ghost" aria-label={t('关闭查找', 'Close find')} className="touch-target-44 h-11 w-11 shrink-0 p-0" onClick={() => setFindOpen(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}

          {isCompact && (
            <Sheet open={moreActionsOpen} onOpenChange={setMoreActionsOpen}>
              <SheetContent
                side="bottom"
                showClose={false}
                className="max-h-[85dvh] gap-3 overflow-hidden rounded-t-2xl p-4 pb-[max(1rem,env(safe-area-inset-bottom))]"
              >
                <SheetHeader className="pr-0">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <SheetTitle className="text-base">{t('仓库操作', 'Repository actions')}</SheetTitle>
                      <SheetDescription>{repository.full_name}</SheetDescription>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      className="touch-target-44 h-11 shrink-0 px-3"
                      onClick={() => setMoreActionsOpen(false)}
                    >
                      {t('完成', 'Done')}
                    </Button>
                  </div>
                </SheetHeader>
                <div className="min-h-0 flex-1 space-y-1 overflow-y-auto">
                  {readmeContent && !loading && (
                    <button type="button" className="flex min-h-11 w-full items-center gap-3 rounded-lg px-3 text-left text-sm hover:bg-accent" onClick={() => { setMoreActionsOpen(false); setFindOpen(true); }}>
                      <Search className="h-4 w-4 shrink-0" aria-hidden="true" />
                      {t('查找', 'Find')}
                    </button>
                  )}
                  {tocItems.length > 0 && (
                    <button type="button" className="flex min-h-11 w-full items-center gap-3 rounded-lg px-3 text-left text-sm hover:bg-accent" aria-pressed={showToc} onClick={() => { setShowToc((open) => !open); setMoreActionsOpen(false); }}>
                      <List className="h-4 w-4 shrink-0" aria-hidden="true" />
                      {t('目录', 'Table of Contents')}
                    </button>
                  )}
                  <button type="button" className="flex min-h-11 w-full items-center gap-3 rounded-lg px-3 text-left text-sm hover:bg-accent" aria-label={t(`字体大小: ${FONT_SIZES[fontSizeIndex].label}`, `Font Size: ${FONT_SIZES[fontSizeIndex].labelEn}`)} onClick={cycleFontSize}>
                    <Type className="h-4 w-4 shrink-0" aria-hidden="true" />
                    {t(`字体大小: ${FONT_SIZES[fontSizeIndex].label}`, `Font Size: ${FONT_SIZES[fontSizeIndex].labelEn}`)}
                  </button>
                  {onAsk && (
                    <button type="button" className="flex min-h-11 w-full items-center gap-3 rounded-lg px-3 text-left text-sm hover:bg-accent" onClick={() => { setMoreActionsOpen(false); onAsk(); }}>
                      <MessageSquareText className="h-4 w-4 shrink-0" aria-hidden="true" />
                      {t('问答此仓库', 'Ask this repository')}
                    </button>
                  )}
                  {onOpenReleases && (
                    <button type="button" className="flex min-h-11 w-full items-center gap-3 rounded-lg px-3 text-left text-sm hover:bg-accent" onClick={() => { setMoreActionsOpen(false); onOpenReleases(); }}>
                      <PackageOpen className="h-4 w-4 shrink-0" aria-hidden="true" />
                      {t('查看 Release', 'View releases')}
                    </button>
                  )}
                  {onToggleSubscribe && (
                    <button type="button" className="flex min-h-11 w-full items-center gap-3 rounded-lg px-3 text-left text-sm hover:bg-accent" aria-pressed={isSubscribed} onClick={() => { setMoreActionsOpen(false); onToggleSubscribe(); }}>
                      {isSubscribed ? <Bell className="h-4 w-4 shrink-0" aria-hidden="true" /> : <BellOff className="h-4 w-4 shrink-0" aria-hidden="true" />}
                      {isSubscribed ? t('取消订阅 Release', 'Unsubscribe from releases') : t('订阅 Release', 'Subscribe to releases')}
                    </button>
                  )}
                  <button type="button" className="flex min-h-11 w-full items-center gap-3 rounded-lg px-3 text-left text-sm hover:bg-accent" onClick={() => void copyLink()}>
                    {linkCopied ? <Check className="h-4 w-4 shrink-0" aria-hidden="true" /> : <Copy className="h-4 w-4 shrink-0" aria-hidden="true" />}
                    {linkCopied ? t('已复制', 'Copied') : t('复制链接', 'Copy link')}
                  </button>
                  <button type="button" className="flex min-h-11 w-full items-center gap-3 rounded-lg px-3 text-left text-sm hover:bg-accent" onClick={() => void copyClone()}>
                    {cloneCopied ? <Check className="h-4 w-4 shrink-0" aria-hidden="true" /> : <Copy className="h-4 w-4 shrink-0" aria-hidden="true" />}
                    {cloneCopied ? t('已复制克隆命令', 'Clone command copied') : t('复制克隆命令', 'Copy clone command')}
                  </button>
                  {canNativeShare && (
                    <button type="button" className="flex min-h-11 w-full items-center gap-3 rounded-lg px-3 text-left text-sm hover:bg-accent" onClick={() => { setMoreActionsOpen(false); void shareRepository(); }}>
                      <Share2 className="h-4 w-4 shrink-0" aria-hidden="true" />
                      {t('分享', 'Share')}
                    </button>
                  )}
                  <a
                    href={repository.html_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex min-h-11 w-full items-center gap-3 rounded-lg px-3 text-sm hover:bg-accent"
                    onClick={() => setMoreActionsOpen(false)}
                  >
                    <ExternalLink className="h-4 w-4 shrink-0" aria-hidden="true" />
                    {t('在 GitHub 上查看', 'View on GitHub')}
                  </a>
                </div>
              </SheetContent>
            </Sheet>
          )}

          <div className="relative flex min-h-0 min-w-0 flex-1 overflow-hidden">
            {showToc && tocItems.length > 0 && (
              <>
                {isCompact && (
                  <button
                    type="button"
                    aria-hidden="true"
                    tabIndex={-1}
                    className="absolute inset-0 z-20 bg-overlay/50"
                    onClick={() => setShowToc(false)}
                  />
                )}
                <div
                  className="readme-scrollbar absolute inset-y-0 left-0 z-30 w-[min(18rem,85vw)] max-w-[85%] flex-shrink-0 overflow-y-auto border-r border-border bg-card p-4 shadow-lg md:relative md:z-0 md:max-w-none md:bg-transparent md:shadow-none dark:border-border"
                  style={isCompact ? undefined : { width: tocWidth }}
                >
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-semibold text-foreground dark:text-foreground">
                      {t('目录', 'Contents')}
                    </h4>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setShowToc(false)}
                      className="md:hidden touch-target-44 h-11 w-11 text-muted-foreground hover:text-foreground"
                      aria-label={t('关闭目录', 'Close TOC')}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                  <nav className="space-y-0.5">
                    {tocItems.map((item) => {
                      const displayText = translatedHeadingMap.get(item.id) || item.text;
                      return (
                        <Button
                          key={item.id}
                          variant="ghost"
                          onClick={() => {
                            scrollToHeading(item.id, item.text);
                            if (typeof window !== 'undefined' && window.innerWidth < 768) {
                              setShowToc(false);
                            }
                          }}
                          className={`touch-target-44 sm:min-h-0 sm:min-w-0 h-auto block w-full text-left text-sm py-1.5 md:py-1 px-2 rounded transition-colors truncate ${tocIndentClass(item.level)} ${tocTextClass(item.level)} ${
                            activeHeadingId === item.id
                              ? 'bg-primary/10 text-primary dark:bg-primary/10 dark:text-primary font-medium'
                              : 'hover:bg-muted dark:hover:bg-card'
                          }`}
                          title={displayText}
                        >
                          {displayText}
                        </Button>
                      );
                    })}
                  </nav>
                </div>
                <div
                  onMouseDown={handleResizeMouseDown}
                  className="hidden md:block w-1.5 cursor-col-resize bg-transparent hover:bg-ring dark:hover:bg-ring transition-colors flex-shrink-0 relative group"
                >
                  <div className="absolute inset-y-0 -left-1 -right-1" />
                </div>
              </>
            )}

            <div
              ref={contentRef}
              className={`repo-detail-markdown relative min-h-0 min-w-0 flex-1 overflow-x-auto overflow-y-auto overscroll-contain px-4 py-4 select-text readme-scrollbar md:p-6 ${currentFontSize}`}
              onScroll={handleScroll}
            >
            {loading ? (
              <div className="flex flex-col items-center justify-center py-12">
                <Loader2 className="w-8 h-8 text-primary dark:text-primary animate-spin mb-4" />
                <p className="text-muted-foreground dark:text-muted-foreground">
                  {language === 'zh' ? '正在加载 README…' : 'Loading README…'}
                </p>
              </div>
            ) : error ? (
              <div className="flex flex-col items-center justify-center py-12">
                <AlertCircle className="w-12 h-12 text-muted-foreground dark:text-muted-foreground mb-4" />
                <p className="text-foreground dark:text-muted-foreground text-center mb-4">
                  {error}
                </p>
                <Button
                  onClick={fetchReadme}
                  className="rounded-lg px-4 py-2 bg-primary text-primary-foreground transition-colors hover:bg-primary/90"
                >
                  {language === 'zh' ? '重试' : 'Retry'}
                </Button>
              </div>
            ) : readmeContent ? (
              <BilingualMarkdownRenderer
                ref={bilingualRef}
                markdown={readmeContent}
                baseUrl={repository?.html_url}
                headingIds={headingIdMap}
                fontSize={getFontSizeType()}
                language={language}
                displayMode={displayMode}
                onDisplayModeChange={setDisplayMode}
                onStatusChange={setTranslateStatus}
                onProgress={(current, total) => setTranslateProgress({ current, total })}
                onHeadingsTranslated={handleHeadingsTranslated}
              />
            ) : (
              <div className="flex flex-col items-center justify-center py-12">
                <FileText className="w-12 h-12 text-muted-foreground dark:text-muted-foreground/70 mb-4" />
                <p className="text-muted-foreground dark:text-muted-foreground">
                  {language === 'zh' ? '该仓库没有 README 文件' : 'This repository has no README file'}
                </p>
              </div>
            )}
            </div>

            {showBackToTop && (
              <Button
                onClick={scrollToTop}
                aria-label={t('回到顶部', 'Back to top')}
                className="absolute bottom-[max(1rem,env(safe-area-inset-bottom,0px))] right-4 z-10 h-11 w-11 rounded-full border border-border bg-card p-0 text-muted-foreground shadow-lg hover:bg-accent hover:text-foreground dark:border-border dark:bg-muted"
                title={t('回到顶部', 'Back to top')}
              >
                <ArrowUp className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
