export const RECENT_REPOSITORIES_KEY = 'gsm:recent-repositories';
export const RECENT_REPOSITORIES_EVENT = 'gsm:recent-repositories';

const MAX_RECENT_REPOSITORIES = 8;

export function readRecentRepositoryIds(): number[] {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(RECENT_REPOSITORIES_KEY) || '[]') as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((id): id is number => typeof id === 'number' && Number.isFinite(id))
      .slice(0, MAX_RECENT_REPOSITORIES);
  } catch {
    return [];
  }
}

export function rememberRepository(id: number): void {
  const next = [id, ...readRecentRepositoryIds().filter((existing) => existing !== id)].slice(0, MAX_RECENT_REPOSITORIES);
  try {
    window.localStorage.setItem(RECENT_REPOSITORIES_KEY, JSON.stringify(next));
    window.dispatchEvent(new Event(RECENT_REPOSITORIES_EVENT));
  } catch {
    // 隐私模式写不进去时，最近打开只在当前这次会话里缺失。
  }
}
