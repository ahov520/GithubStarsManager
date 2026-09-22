import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { Star, StarOff, ExternalLink, Bot, GitFork, Sparkles, BookOpen, AlertTriangle, FileText, Calendar, Share2, MoreHorizontal, Copy, Terminal } from 'lucide-react';
import { getPlatformIcon as getSharedPlatformIcon } from './platformMeta';
import type { DiscoveryRepo } from '../types';
import { useAppStore } from '../store/useAppStore';
import { useDiscoveryRepoActions } from '../features/discovery/hooks/useDiscoveryRepoActions';
import { ReadmeModal } from './ReadmeModal';
import { WeeklyIssueModal } from './WeeklyIssueModal';
import { XTweetModal } from './XTweetModal';
import { TelegramMessageModal } from './TelegramMessageModal';
import { Modal } from './Modal';
import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Button } from './ui/button';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from './ui/sheet';
import { safeWriteText } from '../utils/clipboardUtils';

function useCompactViewport(): boolean {
  const query = '(max-width: 767px)';
  const [compact, setCompact] = useState(() => (
    typeof window !== 'undefined'
    && typeof window.matchMedia === 'function'
    && window.matchMedia(query).matches
  ));

  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return undefined;
    const media = window.matchMedia(query);
    const update = () => setCompact(media.matches);
    update();
    media.addEventListener?.('change', update);
    return () => media.removeEventListener?.('change', update);
  }, []);

  return compact;
}

const textCanExpand = (value?: string) => (value?.length ?? 0) > 40 || Boolean(value?.includes('\n'));

interface SubscriptionRepoCardProps {
  repo: DiscoveryRepo;
  onStar?: (repo: DiscoveryRepo) => void;
  onAnalyze?: (repo: DiscoveryRepo) => void;
  desktopSafeMode?: boolean;
}

export const SubscriptionRepoCard: React.FC<SubscriptionRepoCardProps> = ({ repo, onStar, onAnalyze, desktopSafeMode = false }) => {
  const language = useAppStore(state => state.language);
  const githubToken = useAppStore(state => state.githubToken);

  const t = useCallback((zh: string, en: string) => language === 'zh' ? zh : en, [language]);

  const { analyze, star, executeUnstar, isAnalyzing, isStarring, isStarred } =
    useDiscoveryRepoActions({ repo });

  const [readmeModalOpen, setReadmeModalOpen] = useState(false);
  // 取消Star确认对话框状态（确认 UI 留 View；动作本体在 useDiscoveryRepoActions）
  const [unstarConfirmOpen, setUnstarConfirmOpen] = useState(false);
  // 周刊频道："查看原贴"弹窗
  const [issueModalOpen, setIssueModalOpen] = useState(false);
  // X 推文频道："查看原贴"弹窗
  const [tweetModalOpen, setTweetModalOpen] = useState(false);
  // Telegram 频道："查看消息原文"弹窗
  const [telegramModalOpen, setTelegramModalOpen] = useState(false);
  const [actionsOpen, setActionsOpen] = useState(false);
  const [copiedAction, setCopiedAction] = useState<'url' | 'clone' | null>(null);
  const [descriptionOpen, setDescriptionOpen] = useState(false);
  const [summaryOpen, setSummaryOpen] = useState(false);
  const isCompact = useCompactViewport();

  useEffect(() => {
    setDescriptionOpen(false);
    setSummaryOpen(false);
  }, [repo.id]);

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const languageColors = useMemo(() => ({
    JavaScript: '#f1e05a', TypeScript: '#3178c6', Python: '#3572A5',
    Java: '#b07219', 'C++': '#f34b7d', C: '#555555', 'C#': '#239120',
    Go: '#00ADD8', Rust: '#dea584', PHP: '#4F5D95', Ruby: '#701516',
    Swift: '#fa7343', Kotlin: '#A97BFF', Dart: '#00B4AB',
    Shell: '#89e051', HTML: '#e34c26', CSS: '#1572B6',
  }), []);

  const getLanguageColor = (lang: string | null) => {
    return languageColors[lang as keyof typeof languageColors] || '#6b7280';
  };

  const rankBadgeClass = useMemo(() => {
    return 'bg-muted dark:bg-muted/40 text-muted-foreground dark:text-muted-foreground';
  }, []);

  // 平台图标统一由 platformMeta 模块提供
  const getPlatformIcon = (platform: string) => {
    const Icon = getSharedPlatformIcon(platform);
    return <Icon className="w-3 h-3" />;
  };

  // 执行取消Star操作：确认 UI（自定义 Modal）留 View，动作本体在 hook。
  const confirmUnstar = () => {
    setUnstarConfirmOpen(false);
    void executeUnstar();
  };

  // 处理添加/取消Star：已 Star 时打开自定义确认 Modal，否则执行添加
  const handleStar = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!githubToken || isStarring) return;
    if (isStarred) {
      setUnstarConfirmOpen(true);
      return;
    }
    void star(onStar);
  };

  // 处理在ZRead打开
  const handleOpenInZRead = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    const zreadUrl = `https://zread.ai/${repo.full_name}`;
    window.open(zreadUrl, '_blank');
  }, [repo.full_name]);

  // 处理单个项目AI分析（校验/中止/patch/toast 均在 hook）
  const handleAnalyze = (e: React.MouseEvent) => {
    e.stopPropagation();
    void analyze(onAnalyze);
  };

  // 判断是否已分析
  const isAnalyzed = !!repo.analyzed_at && !repo.analysis_failed;
  const isFailed = !!repo.analysis_failed;

  // 点击卡片打开 README
  const handleCardClick = useCallback(() => {
    setReadmeModalOpen(true);
  }, []);

  // 周刊频道：查看原贴（GitHub 渲染样式的投稿 issue）
  const handleOpenIssue = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setIssueModalOpen(true);
  }, []);

  // X 推文频道：查看原贴（抓取到的推文正文）
  const handleOpenTweet = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setTweetModalOpen(true);
  }, []);

  // Telegram 频道：查看消息原文（抓取到的频道消息正文）
  const handleOpenTelegramMessage = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setTelegramModalOpen(true);
  }, []);

  const weeklyIssueLabels = repo.weeklyIssue?.labels ?? [];
  const isWeeklyCollected = weeklyIssueLabels.some(label => label.toLowerCase() === 'weekly');
  const weeklyIssueNumberLabel = weeklyIssueLabels.find(label => /^issue-\d+$/i.test(label));
  const weeklyIssueNumber = weeklyIssueNumberLabel ? Number(weeklyIssueNumberLabel.replace(/^\D+/i, '')) : null;
  const weeklySubmittedDate = repo.weeklyIssue?.createdAt && Number.isFinite(Date.parse(repo.weeklyIssue.createdAt))
    ? new Date(repo.weeklyIssue.createdAt).toLocaleDateString(language === 'zh' ? 'zh-CN' : 'en-US')
    : '';
  const tweetDate = repo.xTweet?.createdAt && Number.isFinite(Date.parse(repo.xTweet.createdAt))
    ? new Date(repo.xTweet.createdAt).toLocaleDateString(language === 'zh' ? 'zh-CN' : 'en-US')
    : '';

  const cardTitle = repo.full_name || `${repo.owner?.login || ''}/${repo.name || ''}`;
  const canShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function';

  const copyRepositoryText = async (event: React.MouseEvent, kind: 'url' | 'clone') => {
    event.stopPropagation();
    const text = kind === 'clone' ? `git clone ${repo.html_url}.git` : repo.html_url;
    const result = await safeWriteText(text);
    if (!result.success) return;
    setCopiedAction(kind);
    window.setTimeout(() => setCopiedAction((current) => (current === kind ? null : current)), 1500);
  };

  const handleShare = async (event: React.MouseEvent) => {
    event.stopPropagation();
    try {
      await navigator.share({
        title: cardTitle,
        text: repo.description || cardTitle,
        url: repo.html_url,
      });
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return;
    }
  };

  return (
    <>
    <div 
      onClick={handleCardClick}
      className="ui-card min-w-0 max-w-full cursor-pointer overflow-hidden p-4 transition-all duration-200 sm:p-5"
      style={{ userSelect: 'none' }}
      onCopy={(e) => e.preventDefault()}
      onCut={(e) => e.preventDefault()}
      onSelect={(e) => e.preventDefault()}
    >
      <div className="flex items-start gap-3 sm:gap-4">
        {/* Rank badge */}
        <div className={`flex-shrink-0 w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center font-bold text-sm sm:text-lg ${rankBadgeClass}`}>
          {repo.rank}
        </div>

        {/* Main content */}
        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="mb-2 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
            <div className="flex items-center gap-2 min-w-0">
              {!desktopSafeMode && repo.owner?.avatar_url && (
                <img
                  src={repo.owner.avatar_url}
                  alt={repo.owner.login}
                  className="w-6 h-6 rounded-full flex-shrink-0"
                />
              )}
              <span className="font-semibold text-foreground dark:text-foreground truncate">
                {cardTitle}
              </span>
            </div>

            <Button
              type="button"
              variant="outline"
              className="touch-target-44 h-11 w-full justify-start gap-2 md:hidden"
              aria-label={t('发现操作', 'Discovery actions')}
              onClick={(event) => {
                event.stopPropagation();
                setActionsOpen(true);
              }}
            >
              <MoreHorizontal className="h-4 w-4" />
              {t('操作', 'Actions')}
            </Button>
            {/* Action buttons */}
            <div className="hidden items-center gap-1 overflow-x-auto scrollbar-hide md:flex sm:shrink-0">
              {/* AI Analyze button */}
              <Button
                size="icon"
                onClick={handleAnalyze}
                disabled={!githubToken || isAnalyzing}
                aria-label={isAnalyzed || isFailed ? t('重新分析', 'Re-analyze') : t('AI分析', 'AI Analyze')}
                className="touch-target-44 flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground disabled:cursor-not-allowed disabled:opacity-50 sm:h-8 sm:w-8"
                title={
                  isAnalyzed 
                    ? t('重新分析', 'Re-analyze') 
                    : isFailed 
                    ? t('重新分析', 'Re-analyze')
                    : t('AI分析', 'AI Analyze')
                }
              >
                {isAnalyzing ? (
                  <div className="w-3.5 h-3.5 sm:w-4 sm:h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                ) : isAnalyzed ? (
                  <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                ) : (
                  <Bot className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                )}
              </Button>

              {/* ZRead button - hidden on small screens */}
              <Button
                size="icon"
                onClick={handleOpenInZRead}
                aria-label={t('在ZRead打开', 'Open in ZRead')}
                className="hidden h-8 w-8 items-center justify-center rounded-lg bg-muted text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground sm:flex"
                title={t('在ZRead打开', 'Open in ZRead')}
              >
                <BookOpen className="w-4 h-4" />
              </Button>

              {/* 周刊/推文/频道消息：查看原贴按钮 */}
              {(repo.weeklyIssue || repo.xTweet || repo.telegram) && (
                repo.telegram ? (
                  <Button
                    size="icon"
                    onClick={handleOpenTelegramMessage}
                    className="touch-target-44 flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground sm:h-8 sm:w-8"
                    title={t('查看频道消息原文', 'View original channel message')}
                  >
                    <FileText className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  </Button>
                ) : repo.xTweet ? (
                  <Button
                    size="icon"
                    onClick={handleOpenTweet}
                    className="touch-target-44 flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground sm:h-8 sm:w-8"
                    title={t('查看原贴', 'View original post')}
                  >
                    <FileText className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  </Button>
                ) : (
                  <Button
                    size="icon"
                    onClick={handleOpenIssue}
                    className="touch-target-44 flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground sm:h-8 sm:w-8"
                    title={t('查看原贴', 'View original post')}
                  >
                    <FileText className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  </Button>
                )
              )}

              {/* GitHub button - hidden on small screens */}
              <a
                href={repo.html_url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(event) => event.stopPropagation()}
                aria-label={t('在GitHub打开', 'Open on GitHub')}
                className="touch-target-44 flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground sm:h-8 sm:w-8"
                title={t('在GitHub打开', 'Open on GitHub')}
              >
                <ExternalLink className="w-4 h-4" />
              </a>
              {canShare && (
                <Button
                  type="button"
                  size="icon"
                  onClick={handleShare}
                  aria-label={t('分享', 'Share')}
                  title={t('分享', 'Share')}
                  className="touch-target-44 flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground sm:h-8 sm:w-8"
                >
                  <Share2 className="h-4 w-4" />
                </Button>
              )}

              {/* Star button */}
              <Button
                size="icon"
                onClick={handleStar}
                disabled={!githubToken || isStarring}
                aria-label={isStarred ? t('取消Star', 'Unstar') : t('添加Star', 'Add Star')}
                className={`touch-target-44 flex h-11 w-11 shrink-0 items-center justify-center rounded-lg transition-colors disabled:cursor-not-allowed disabled:opacity-50 sm:h-8 sm:w-8 ${
                  isStarred
                    ? 'bg-primary text-primary-foreground shadow-sm dark:bg-primary/80 dark:text-primary-foreground'
                    : 'bg-muted text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                }`}
                title={isStarred ? t('取消Star', 'Unstar') : t('添加Star', 'Add Star')}
              >
                {isStarring ? (
                  <div className="w-3.5 h-3.5 sm:w-4 sm:h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                ) : isStarred ? (
                  <StarOff className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                ) : (
                  <Star className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                )}
              </Button>
            </div>
          </div>

          {/* Description. Phones expand the blurb in place; hover popovers stay on wider screens. */}
          {repo.description && isCompact && (
            <div className="mb-3 min-w-0 max-w-full">
              <p className={`overflow-hidden break-words text-sm text-muted-foreground dark:text-muted-foreground ${descriptionOpen ? '' : 'line-clamp-2'}`}>
                {repo.description}
              </p>
              {textCanExpand(repo.description) && (
                <button
                  type="button"
                  className="touch-target-44 mt-1 inline-flex h-11 items-center rounded-md px-2 text-sm font-medium text-primary"
                  aria-expanded={descriptionOpen}
                  onClick={(event) => {
                    event.stopPropagation();
                    setDescriptionOpen((open) => !open);
                  }}
                >
                  {descriptionOpen ? t('收起描述', 'Show less') : t('展开描述', 'Show more')}
                </button>
              )}
            </div>
          )}
          {repo.description && !isCompact && (
            <Popover>
              <Tooltip>
                <TooltipTrigger asChild>
                  <PopoverTrigger asChild>
                    <button
                      type="button"
                      onClick={(event) => event.stopPropagation()}
                      className="relative mb-3 block w-full min-w-0 max-w-full cursor-text overflow-hidden text-left"
                    >
                      <span className="block overflow-hidden break-words text-sm text-muted-foreground dark:text-muted-foreground line-clamp-2 rounded px-1 -mx-1 hover:bg-accent/50 dark:hover:bg-card/[0.02] transition-colors duration-200">
                        {repo.description}
                      </span>
                    </button>
                  </PopoverTrigger>
                </TooltipTrigger>
                <TooltipContent side="top" align="start" className="max-w-lg whitespace-pre-wrap break-words">
                  {repo.description}
                </TooltipContent>
              </Tooltip>
              <PopoverContent side="top" align="start" className="max-w-lg whitespace-pre-wrap break-words" onClick={(event) => event.stopPropagation()}>
                {repo.description}
              </PopoverContent>
            </Popover>
          )}

          {repo.ai_summary && isCompact && (
            <div className="mb-3 flex min-w-0 max-w-full items-start gap-1.5">
              <Bot className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
              <div className="min-w-0 flex-1">
                <p className={`overflow-hidden break-words text-sm text-muted-foreground dark:text-muted-foreground ${summaryOpen ? '' : 'line-clamp-2'}`}>
                  {repo.ai_summary}
                </p>
                {textCanExpand(repo.ai_summary) && (
                  <button
                    type="button"
                    className="touch-target-44 mt-1 inline-flex h-11 items-center rounded-md px-2 text-sm font-medium text-primary"
                    aria-expanded={summaryOpen}
                    onClick={(event) => {
                      event.stopPropagation();
                      setSummaryOpen((open) => !open);
                    }}
                  >
                    {summaryOpen ? t('收起总结', 'Hide summary') : t('展开总结', 'Show summary')}
                  </button>
                )}
              </div>
            </div>
          )}
          {repo.ai_summary && !isCompact && (
            <Popover>
              <Tooltip>
                <TooltipTrigger asChild>
                  <PopoverTrigger asChild>
                    <button
                      type="button"
                      onClick={(event) => event.stopPropagation()}
                      className="relative mb-3 flex w-full min-w-0 max-w-full cursor-text items-start gap-1.5 overflow-hidden text-left"
                    >
                      <Bot className="mt-0.5 h-4 w-4 flex-shrink-0 text-muted-foreground dark:text-muted-foreground" aria-hidden="true" />
                      <span className="block min-w-0 overflow-hidden break-words text-sm text-muted-foreground dark:text-muted-foreground line-clamp-2 rounded px-1 -mx-1 hover:bg-accent/50 dark:hover:bg-card/[0.02] transition-colors duration-200">
                        {repo.ai_summary}
                      </span>
                    </button>
                  </PopoverTrigger>
                </TooltipTrigger>
                <TooltipContent side="top" align="start" className="max-w-lg whitespace-pre-wrap break-words">
                  {repo.ai_summary}
                </TooltipContent>
              </Tooltip>
              <PopoverContent side="top" align="start" className="max-w-lg whitespace-pre-wrap break-words" onClick={(event) => event.stopPropagation()}>
                {repo.ai_summary}
              </PopoverContent>
            </Popover>
          )}

          {/* Tags */}
          {((repo.ai_tags && repo.ai_tags.length > 0) || (repo.topics && repo.topics.length > 0) || repo.weeklyIssue || repo.xTweet || repo.telegram) && (
            <div className="flex flex-wrap gap-1.5 mb-3">
              {repo.telegram && (
                <span className="px-2 py-0.5 rounded-md text-xs font-medium bg-primary/10 text-primary dark:text-primary">
                  @{repo.telegram.channel}
                </span>
              )}
              {repo.xTweet && (
                <span className="px-2 py-0.5 rounded-md text-xs font-medium bg-primary/10 text-primary dark:text-primary">
                  @{repo.xTweet.handle}
                </span>
              )}
              {repo.weeklyIssue && (
                <>
                  {isWeeklyCollected && (
                    <span className="px-2 py-0.5 rounded-md text-xs font-medium bg-primary/10 text-primary dark:text-primary">
                      {t('周刊收录', 'In Weekly')}
                    </span>
                  )}
                  {weeklyIssueNumber != null && (
                    <span className="px-2 py-0.5 rounded-md text-xs font-medium bg-muted text-muted-foreground dark:text-muted-foreground">
                      {t(`第 ${weeklyIssueNumber} 期`, `Issue #${weeklyIssueNumber}`)}
                    </span>
                  )}
                </>
              )}
              {(repo.ai_tags || repo.topics || []).slice(0, 5).map((tag) => (
                <span
                  key={tag}
                  className="px-2 py-0.5 rounded-md text-xs font-medium bg-muted text-muted-foreground dark:text-muted-foreground dark:bg-primary/20"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}

          {/* Platform icons */}
          {repo.ai_platforms && repo.ai_platforms.length > 0 && (
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xs text-muted-foreground dark:text-muted-foreground">
                {t('平台:', 'Platforms:')}
              </span>
              <div className="flex items-center gap-1">
                {repo.ai_platforms.slice(0, 5).map((platform) => (
                  <span key={platform} className="text-muted-foreground dark:text-muted-foreground" title={platform}>
                    {getPlatformIcon(platform)}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Stats */}
          <div className="flex items-center gap-4 text-sm text-muted-foreground dark:text-muted-foreground">
            {repo.language && (
              <div className="flex items-center gap-1">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: getLanguageColor(repo.language) }}
                />
                <span className="truncate max-w-20">{repo.language}</span>
              </div>
            )}
            <div className="flex items-center gap-1">
              <Star className="w-4 h-4" />
              <span>{formatNumber(repo.stargazers_count)}</span>
            </div>
            <div className="flex items-center gap-1">
              <GitFork className="w-4 h-4" />
              <span>{formatNumber(repo.forks_count ?? repo.forks ?? 0)}</span>
            </div>
            {(weeklySubmittedDate || tweetDate) && (
              <div className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" />
                <span>{weeklySubmittedDate || tweetDate}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>

    {/* Unstar Confirm Modal */}
    <Modal
      isOpen={unstarConfirmOpen}
      onClose={() => {
        setUnstarConfirmOpen(false);
      }}
      title={t('确认取消 Star', 'Confirm Unstar')}
      maxWidth="max-w-sm"
    >
      <div className="space-y-4">
        <div className="flex items-center gap-3 text-muted-foreground dark:text-muted-foreground ">
          <AlertTriangle className="w-8 h-8 flex-shrink-0" />
          <p className="text-sm text-muted-foreground dark:text-muted-foreground">
            {language === 'zh' 
              ? `确定要取消 Star "${repo.full_name}" 吗？这将会从您的 GitHub 收藏中移除该仓库。`
              : `Are you sure you want to unstar "${repo.full_name}"? This will remove the repository from your GitHub stars.`}
          </p>
        </div>
        <div className="flex gap-3 justify-end">
          <Button
            onClick={() => {
              setUnstarConfirmOpen(false);
            }}
            variant="ghost"
            className="px-4 py-2 rounded-lg text-sm font-medium text-muted-foreground dark:text-muted-foreground hover:bg-muted dark:hover:bg-accent transition-colors"
          >
            {t('取消', 'Cancel')}
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={confirmUnstar}
            className="rounded-lg px-4 py-2 text-sm font-medium"
          >
            {t('确认取消', 'Confirm Unstar')}
          </Button>
        </div>
      </div>
    </Modal>

    {/* README Modal */}
      <ReadmeModal
        isOpen={readmeModalOpen}
        onClose={() => setReadmeModalOpen(false)}
        repository={repo} />

    {/* 周刊原贴 Modal */}
      {repo.weeklyIssue && (
        <WeeklyIssueModal
          isOpen={issueModalOpen}
          onClose={() => setIssueModalOpen(false)}
          issue={repo.weeklyIssue} />
      )}

    {/* X 推文原贴 Modal */}
      {repo.xTweet && (
        <XTweetModal
          isOpen={tweetModalOpen}
          onClose={() => setTweetModalOpen(false)}
          tweet={repo.xTweet} />
      )}

    {/* Telegram 频道消息原文 Modal */}
      {repo.telegram && (
        <TelegramMessageModal
          isOpen={telegramModalOpen}
          onClose={() => setTelegramModalOpen(false)}
          message={repo.telegram} />
      )}

      <Sheet open={actionsOpen} onOpenChange={setActionsOpen}>
        <SheetContent
          side="bottom"
          showClose={false}
          className="max-h-[85dvh] gap-3 overflow-hidden rounded-t-2xl p-4 pb-[max(1rem,env(safe-area-inset-bottom))] md:hidden"
          onClick={(event) => event.stopPropagation()}
        >
          <SheetHeader className="pr-0">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <SheetTitle className="text-base">{t('发现操作', 'Discovery actions')}</SheetTitle>
                <SheetDescription className="truncate">{cardTitle}</SheetDescription>
              </div>
              <Button type="button" variant="ghost" className="touch-target-44 h-11 shrink-0 px-3" onClick={() => setActionsOpen(false)}>
                {t('完成', 'Done')}
              </Button>
            </div>
          </SheetHeader>
          <div className="min-h-0 flex-1 space-y-1 overflow-y-auto">
            <button
              type="button"
              className="flex min-h-11 w-full items-center gap-3 rounded-lg px-3 text-left text-sm hover:bg-accent disabled:opacity-50"
              disabled={!githubToken || isAnalyzing}
              onClick={(event) => {
                setActionsOpen(false);
                handleAnalyze(event);
              }}
            >
              <Bot className="h-4 w-4 shrink-0" aria-hidden="true" />
              {isAnalyzed || isFailed ? t('重新分析', 'Re-analyze') : t('AI分析', 'AI Analyze')}
            </button>
            <button
              type="button"
              className="flex min-h-11 w-full items-center gap-3 rounded-lg px-3 text-left text-sm hover:bg-accent"
              onClick={(event) => {
                setActionsOpen(false);
                handleOpenInZRead(event);
              }}
            >
              <BookOpen className="h-4 w-4 shrink-0" aria-hidden="true" />
              {t('在ZRead打开', 'Open in ZRead')}
            </button>
            {(repo.weeklyIssue || repo.xTweet || repo.telegram) && (
              <button
                type="button"
                className="flex min-h-11 w-full items-center gap-3 rounded-lg px-3 text-left text-sm hover:bg-accent"
                onClick={(event) => {
                  setActionsOpen(false);
                  if (repo.telegram) handleOpenTelegramMessage(event);
                  else if (repo.xTweet) handleOpenTweet(event);
                  else handleOpenIssue(event);
                }}
              >
                <FileText className="h-4 w-4 shrink-0" aria-hidden="true" />
                {repo.telegram ? t('查看频道消息原文', 'View original channel message') : t('查看原贴', 'View original post')}
              </button>
            )}
            <button
              type="button"
              className="flex min-h-11 w-full items-center gap-3 rounded-lg px-3 text-left text-sm hover:bg-accent"
              onClick={(event) => { void copyRepositoryText(event, 'url'); }}
            >
              <Copy className="h-4 w-4 shrink-0" aria-hidden="true" />
              {copiedAction === 'url' ? t('已复制链接', 'Link copied') : t('复制链接', 'Copy link')}
            </button>
            <button
              type="button"
              className="flex min-h-11 w-full items-center gap-3 rounded-lg px-3 text-left text-sm hover:bg-accent"
              onClick={(event) => { void copyRepositoryText(event, 'clone'); }}
            >
              <Terminal className="h-4 w-4 shrink-0" aria-hidden="true" />
              {copiedAction === 'clone' ? t('已复制克隆命令', 'Clone command copied') : t('复制克隆命令', 'Copy clone command')}
            </button>
            <a
              href={repo.html_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex min-h-11 w-full items-center gap-3 rounded-lg px-3 text-sm hover:bg-accent"
              onClick={() => setActionsOpen(false)}
            >
              <ExternalLink className="h-4 w-4 shrink-0" aria-hidden="true" />
              {t('在GitHub打开', 'Open on GitHub')}
            </a>
            {canShare && (
              <button
                type="button"
                className="flex min-h-11 w-full items-center gap-3 rounded-lg px-3 text-left text-sm hover:bg-accent"
                onClick={(event) => {
                  setActionsOpen(false);
                  void handleShare(event);
                }}
              >
                <Share2 className="h-4 w-4 shrink-0" aria-hidden="true" />
                {t('分享', 'Share')}
              </button>
            )}
            <button
              type="button"
              className="flex min-h-11 w-full items-center gap-3 rounded-lg px-3 text-left text-sm hover:bg-accent disabled:opacity-50"
              disabled={!githubToken || isStarring}
              onClick={(event) => {
                setActionsOpen(false);
                handleStar(event);
              }}
            >
              {isStarred ? <StarOff className="h-4 w-4 shrink-0" aria-hidden="true" /> : <Star className="h-4 w-4 shrink-0" aria-hidden="true" />}
              {isStarred ? t('取消Star', 'Unstar') : t('添加Star', 'Add Star')}
            </button>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
};
