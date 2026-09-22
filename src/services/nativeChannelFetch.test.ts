import { describe, it, expect, vi, beforeEach } from 'vitest';

const httpGet = vi.hoisted(() => vi.fn());
const isNative = vi.hoisted(() => vi.fn(() => true));

vi.mock('@capacitor/core', () => ({
  Capacitor: { isNativePlatform: () => isNative() },
  CapacitorHttp: { get: (...args: unknown[]) => httpGet(...args) },
}));

import {
  fetchTelegramChannelViaNative,
  fetchXGraphQLViaNative,
  fetchXTimelineViaNative,
  isNativeChannelFetchAvailable,
} from './nativeChannelFetch';
import { defaultTelegramChannelTransport } from './telegramService';
import { defaultXGraphQLTransport, defaultXTimelineTransport } from './xTweetService';

const ok = (data: unknown, url: string) => ({ status: 200, data, url, headers: {} });

describe('native channel fetch', () => {
  beforeEach(() => {
    httpGet.mockReset();
    isNative.mockReturnValue(true);
  });

  it('fetches a telegram preview page through the system http client', async () => {
    httpGet.mockResolvedValue(ok('<html>tg</html>', 'https://t.me/s/geekhub23'));
    await expect(fetchTelegramChannelViaNative('geekhub23', '100')).resolves.toBe('<html>tg</html>');
    expect(httpGet).toHaveBeenCalledWith(expect.objectContaining({
      url: 'https://t.me/s/geekhub23?before=100',
      responseType: 'text',
      disableRedirects: false,
    }));
    const headers = httpGet.mock.calls[0][0].headers as Record<string, string>;
    expect(headers['User-Agent']).toContain('Chrome');
    expect(headers['x-cap-user-agent']).toBe(headers['User-Agent']);
  });

  it('rejects a non-2xx telegram response', async () => {
    httpGet.mockResolvedValue({ status: 403, data: 'nope', url: 'https://t.me/s/geekhub23', headers: {} });
    await expect(fetchTelegramChannelViaNative('geekhub23')).rejects.toThrow('t.me responded 403');
  });

  it('fetches an x profile and stringifies a parsed graphql payload', async () => {
    httpGet.mockResolvedValueOnce(ok('<html>timeline</html>', 'https://x.com/geekbb'));
    await expect(fetchXTimelineViaNative('geekbb')).resolves.toBe('<html>timeline</html>');

    httpGet.mockResolvedValueOnce(ok({ data: { user: { result: { rest_id: '1' } } } }, 'https://x.com/i/api/graphql/abc/UserByScreenName?variables=%7B%7D'));
    const body = await fetchXGraphQLViaNative(
      'https://x.com/i/api/graphql/abc/UserByScreenName?variables=%7B%7D',
      { authToken: 'token', ct0: 'csrf' },
    );
    expect(JSON.parse(body).data.user.result.rest_id).toBe('1');
    const headers = httpGet.mock.calls[1][0].headers as Record<string, string>;
    expect(headers.Cookie).toBe('auth_token=token; ct0=csrf');
    expect(headers.Authorization).toContain('Bearer ');
    expect(httpGet.mock.calls[1][0].disableRedirects).toBe(true);
  });

  it('does not attach x cookies to the main script host and blocks redirects', async () => {
    const script = 'https://abs.twimg.com/responsive-web/client-web/main.abc.js';
    httpGet.mockResolvedValue(ok('queryId:"abc",operationName:"UserTweets"', script));
    await fetchXGraphQLViaNative(script, { authToken: 'token', ct0: 'csrf' });
    expect(httpGet.mock.calls[0][0].headers.Cookie).toBeUndefined();

    httpGet.mockResolvedValue(ok('nope', 'https://evil.example/steal'));
    await expect(fetchXGraphQLViaNative('https://x.com/home', { authToken: 'token', ct0: 'csrf' }))
      .rejects.toThrow('redirect blocked');
    await expect(fetchXGraphQLViaNative('https://example.com/phish', { authToken: 'token', ct0: 'csrf' }))
      .rejects.toThrow('invalid url');
    expect(httpGet).toHaveBeenCalledTimes(2);
  });

  it('uses the native transport from the discovery channels on android', async () => {
    httpGet.mockResolvedValue(ok('<html>native</html>', 'https://t.me/s/geekhub23'));
    await expect(defaultTelegramChannelTransport('geekhub23')).resolves.toBe('<html>native</html>');
    httpGet.mockResolvedValue(ok('<html>x</html>', 'https://x.com/geekbb'));
    await expect(defaultXTimelineTransport('geekbb')).resolves.toBe('<html>x</html>');
    httpGet.mockResolvedValue(ok('{"ok":true}', 'https://x.com/home'));
    await expect(defaultXGraphQLTransport('https://x.com/home', { authToken: 'token', ct0: 'csrf' }))
      .resolves.toBe('{"ok":true}');
  });

  it('keeps the browser error when the app is not running natively', async () => {
    isNative.mockReturnValue(false);
    expect(isNativeChannelFetchAvailable()).toBe(false);
    await expect(defaultTelegramChannelTransport('geekhub23')).rejects.toThrow('安卓应用');
    await expect(defaultXTimelineTransport('geekbb')).rejects.toThrow('安卓应用');
    expect(httpGet).not.toHaveBeenCalled();
  });
});
