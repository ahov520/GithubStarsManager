import { initialSearchFilters } from '../store/schema';
import { useAppStore } from '../store/useAppStore';
import { hasActiveSearchFilters } from './repoSearch';

export type AndroidBackResult = 'handled' | 'exit';

const OVERLAY_SELECTOR = [
  '[data-state="open"][role="dialog"]',
  '[data-state="open"][role="alertdialog"]',
  '[data-state="open"][role="menu"]',
  '[data-state="open"][role="listbox"]',
].join(', ');

let lastOverlay: Element | null = null;

export function topAndroidOverlay(root: ParentNode = document): Element | null {
  const nodes = root.querySelectorAll(OVERLAY_SELECTOR);
  return nodes.length > 0 ? nodes[nodes.length - 1] : null;
}

function dismissOverlay(overlay: Element): void {
  const escape = new KeyboardEvent('keydown', {
    key: 'Escape',
    code: 'Escape',
    keyCode: 27,
    bubbles: true,
    cancelable: true,
  });
  overlay.dispatchEvent(escape);
  document.dispatchEvent(escape);
}

/** Android 系统返回：先关浮层，再退出相似/搜索/子页面，最后才交给系统退出应用。 */
export function handleAndroidBack(): AndroidBackResult {
  const overlay = topAndroidOverlay();
  if (overlay) {
    if (overlay === lastOverlay) {
      lastOverlay = null;
      return 'exit';
    }
    lastOverlay = overlay;
    dismissOverlay(overlay);
    return 'handled';
  }

  lastOverlay = null;
  const state = useAppStore.getState();
  if (!state.isAuthenticated) return 'exit';
  if (state.similarView?.active) {
    state.exitSimilarView();
    return 'handled';
  }
  if (state.currentView === 'repositories' && hasActiveSearchFilters(state.searchFilters)) {
    state.setSearchFilters({ ...initialSearchFilters });
    return 'handled';
  }
  if (state.currentView !== 'repositories') {
    state.setCurrentView('repositories');
    return 'handled';
  }
  return 'exit';
}

export function installAndroidBackButton(): () => void {
  window.__gsmAndroidBack = handleAndroidBack;
  return () => {
    if (window.__gsmAndroidBack === handleAndroidBack) {
      delete window.__gsmAndroidBack;
    }
  };
}

declare global {
  interface Window {
    __gsmAndroidBack?: () => AndroidBackResult;
  }
}
