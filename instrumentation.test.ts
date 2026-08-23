import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { register } from './instrumentation';

const mockGenerateContent = vi.fn();

vi.mock('@google/genai', () => ({
  GoogleGenAI: class {
    models = {
      generateContent: mockGenerateContent,
    };
  },
}));

describe('instrumentation startup validation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('skips AI validation when GEMINI_API_KEY is missing', () => {
    vi.stubEnv('NODE_ENV', 'development');
    vi.stubEnv('GEMINI_API_KEY', '');

    expect(() => register()).not.toThrow();
    expect(mockGenerateContent).not.toHaveBeenCalled();
  });

  it('skips AI validation under NODE_ENV=test even if GEMINI_API_KEY is present', () => {
    vi.stubEnv('NODE_ENV', 'test');
    vi.stubEnv('GEMINI_API_KEY', 'some-key');

    expect(() => register()).not.toThrow();
    expect(mockGenerateContent).not.toHaveBeenCalled();
  });

  it('triggers non-blocking validation call when GEMINI_API_KEY is set in non-test env', async () => {
    vi.stubEnv('NODE_ENV', 'development');
    vi.stubEnv('GEMINI_API_KEY', 'real-key');
    mockGenerateContent.mockResolvedValueOnce({ text: 'pong' });

    expect(() => register()).not.toThrow();
    expect(mockGenerateContent).toHaveBeenCalledWith({
      model: 'gemini-3.6-flash',
      contents: 'ping',
    });
  });

  it('logs loud error on AI model failure without throwing an exception', async () => {
    vi.stubEnv('NODE_ENV', 'development');
    vi.stubEnv('GEMINI_API_KEY', 'real-key');
    const spyConsole = vi.spyOn(console, 'error').mockImplementation(() => {});
    mockGenerateContent.mockRejectedValueOnce(new Error('Model not found'));

    expect(() => register()).not.toThrow();

    // Allow promise microtask to resolve
    await new Promise((resolve) => setTimeout(resolve, 10));

    expect(spyConsole).toHaveBeenCalledWith(
      expect.stringContaining('[AI Startup Warning] Gemini AI model validation failed [model: gemini-3.6-flash]:'),
      'Model not found'
    );
  });
});
