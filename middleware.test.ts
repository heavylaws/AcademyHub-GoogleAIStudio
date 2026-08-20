import { describe, expect, it } from 'vitest';
import { NextRequest } from 'next/server';
import { middleware } from './middleware';

describe('security middleware', () => {
  it('adds hardening headers to HTTP responses', () => {
    const request = new NextRequest('https://example.com/dashboard');
    const response = middleware(request);

    expect(response.headers.get('x-frame-options')).toBe('DENY');
    expect(response.headers.get('x-content-type-options')).toBe('nosniff');
    expect(response.headers.get('referrer-policy')).toBe('strict-origin-when-cross-origin');
    expect(response.headers.get('permissions-policy')).toBe('camera=(), microphone=(), geolocation=()');
    expect(response.headers.get('strict-transport-security')).toBe('max-age=31536000; includeSubDomains');
  });

  it('does not set HSTS for insecure requests', () => {
    const request = new NextRequest('http://example.com/dashboard');
    const response = middleware(request);

    expect(response.headers.get('strict-transport-security')).toBeNull();
  });
});
