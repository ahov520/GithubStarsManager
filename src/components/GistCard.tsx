import React, { useMemo } from 'react';
import { Bot, Clock, Copy, Edit3, ExternalLink, FileCode2, Loader2, Share2, StarOff, Trash2, User } from 'lucide-react';
import type { Gist } from '../types';
import { useAppStore } from '../store/useAppStore';
import { useGistActions } from '../features/gists/hooks/useGistActions';
import { useDialog } from '../hooks/useDialog';
import { safeWriteText } from '../utils/clipboardUtils';
import { getGistFileCount, getGistPrimaryLanguage, getGistTitle } from '../utils/gistUtils';
import { Button } from './ui/button';

interface GistCardProps {
  gist: Gist;
  isMine: boolean;
  onOpen: (gist: Gist) => void;
  onEdit: (gist: Gist) => void;
  onDeleted?: (gistId: string) => void;
  onUnstarred: (gistId: string) => void;
}

export const GistCard: React.FC<GistCardProps> = ({
  gist,
  isMine,
  onOpen,
  onEdit,
  onDeleted,
  onUnstarred,
}) => {
  const language = useAppStore(state => state.language);
  const { analyzeOne, unstarGist, deleteGist, isAnalyzingGist, isMutating } = useGistActions();
  const { toast } = useDialog();
  const t = (zh: string, en: string) => language === 'zh' ? zh : en;
  const title = getGistTitle(gist);
  const primaryLanguage = getGistPrimaryLanguage(gist);
  const fileCount = getGistFileCount(gist);
  const isAnalyzing = isAnalyzingGist(gist.id);

  const fileNames = useMemo(() =>
    Object.values(gist.files || {}).slice(0, 3).map(file => file.filename).join(', '),
    [gist.files]
  );

  const handleCopyLink = async (event: React.MouseEvent) => {
    event.stopPropagation();
    const result = await safeWriteText(gist.html_url);
    toast(result.success ? t('链接已复制', 'Link copied') : (result.error || t('复制失败', 'Copy failed')), result.success ? 'success' : 'error');
  };

  const canShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function';

  const handleShare = async (event: React.MouseEvent) => {
    event.stopPropagation();
    try {
      await navigator.share({
        title,
        text: gist.description || title,
        url: gist.html_url,
      });
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return;
      toast(t('分享失败', 'Share failed'), 'error');
    }
  };

  const handleAnalyze = (event: React.MouseEvent) => {
    event.stopPropagation();
    void analyzeOne(gist);
  };

  const handleUnstar = (event: React.MouseEvent) => {
    event.stopPropagation();
    void unstarGist(gist, onUnstarred);
  };

  const handleDelete = (event: React.MouseEvent) => {
    event.stopPropagation();
    void deleteGist(gist, onDeleted);
  };

  return (
    <article
      onClick={() => onOpen(gist)}
      className="ui-card group cursor-pointer p-4 sm:p-5"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-base font-semibold text-foreground dark:text-foreground">{title}</h3>
          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground dark:text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <User className="h-4 w-4" />
              {gist.owner?.login || t('未知', 'Unknown')}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Clock className="h-4 w-4" />
              {new Date(gist.updated_at).toLocaleDateString()}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <FileCode2 className="h-4 w-4" />
              {fileCount} {t('个文件', 'files')}
            </span>
            {primaryLanguage && <span>{primaryLanguage}</span>}
            <span>{gist.public ? t('公开', 'Public') : t('私有', 'Secret')}</span>
          </div>
        </div>

        <div className="flex items-center gap-1 overflow-x-auto scrollbar-hide sm:shrink-0">
          <Button
            type="button"
            variant="ghost"
            onClick={handleAnalyze}
            disabled={isAnalyzing}
            aria-label={t('AI分析', 'AI analyze')}
            className="touch-target-44 h-11 w-11 shrink-0 rounded-lg p-0 text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary disabled:opacity-50 dark:text-muted-foreground dark:hover:bg-primary/15 dark:hover:text-primary sm:h-8 sm:w-8"
            title={t('AI分析', 'AI analyze')}
          >
            {isAnalyzing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Bot className="h-4 w-4" />}
          </Button>
          <Button
            type="button"
            variant="ghost"
            onClick={handleCopyLink}
            aria-label={t('复制链接', 'Copy link')}
            className="touch-target-44 h-11 w-11 shrink-0 rounded-lg p-0 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground sm:h-8 sm:w-8"
            title={t('复制链接', 'Copy link')}
          >
            <Copy className="h-4 w-4" />
          </Button>
          <a
            href={gist.html_url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(event) => event.stopPropagation()}
            aria-label={t('打开链接', 'Open link')}
            className="touch-target-44 inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg p-0 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground sm:h-8 sm:w-8"
            title={t('打开链接', 'Open link')}
          >
            <ExternalLink className="h-4 w-4" />
          </a>
          {canShare && (
            <Button
              type="button"
              variant="ghost"
              onClick={handleShare}
              aria-label={t('分享', 'Share')}
              className="touch-target-44 h-11 w-11 shrink-0 rounded-lg p-0 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground sm:h-8 sm:w-8"
              title={t('分享', 'Share')}
            >
              <Share2 className="h-4 w-4" />
            </Button>
          )}
          {gist.starred && (
            <Button
              type="button"
              variant="ghost"
              onClick={handleUnstar}
              disabled={isMutating}
              aria-label={t('取消收藏', 'Unstar')}
              className="touch-target-44 h-11 w-11 shrink-0 rounded-lg p-0 text-muted-foreground transition-colors hover:bg-warning/10 hover:text-warning disabled:opacity-50 dark:text-muted-foreground sm:h-8 sm:w-8"
              title={t('取消收藏', 'Unstar')}
            >
              <StarOff className="h-4 w-4" />
            </Button>
          )}
          {isMine && (
            <>
              <Button
                type="button"
                variant="ghost"
                onClick={(event) => {
                  event.stopPropagation();
                  onEdit(gist);
                }}
                aria-label={t('编辑', 'Edit')}
                className="touch-target-44 h-11 w-11 shrink-0 rounded-lg p-0 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground sm:h-8 sm:w-8"
                title={t('编辑', 'Edit')}
              >
                <Edit3 className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={handleDelete}
                disabled={isMutating}
                aria-label={t('删除', 'Delete')}
                className="touch-target-44 h-11 w-11 shrink-0 rounded-lg p-0 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive disabled:opacity-50 dark:text-muted-foreground sm:h-8 sm:w-8"
                title={t('删除', 'Delete')}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </>
          )}
        </div>
      </div>

      <p className="mt-4 line-clamp-2 text-sm leading-6 text-muted-foreground dark:text-muted-foreground">
        {gist.ai_summary || gist.description || fileNames || t('暂无描述', 'No description')}
      </p>

      {gist.analysis_failed && (
        <div className="mt-3 rounded-lg bg-destructive/10 px-3 py-2 text-xs text-destructive">
          {gist.analysis_error || t('AI 分析失败', 'AI analysis failed')}
        </div>
      )}
    </article>
  );
};
