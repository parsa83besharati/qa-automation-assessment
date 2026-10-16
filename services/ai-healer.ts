import OpenAI from 'openai';
import type { Page } from '@playwright/test';
import { env } from '../config/env';
import { logger } from '../utils/logger';

// ---------------------------------------------------------------------------
// Contracts
// ---------------------------------------------------------------------------

export interface HealingResult {
  healedSelector: string | null;
  usedSelector: string | null;
  confidence: number;
  provider?: string;
  cached?: boolean;
  error?: string;
}

interface HealingCacheEntry {
  selector: string;
  healedSelector: string;
  provider: string;
  timestamp: number;
  hitCount: number;
}

// ---------------------------------------------------------------------------
// LLM providers (OOP: abstraction + inheritance + polymorphism)
// ---------------------------------------------------------------------------

abstract class BaseLlmProvider {
  public abstract readonly name: string;
  public abstract readonly priority: number;

  protected readonly client: OpenAI;
  protected readonly model: string;

  protected constructor(apiKey: string, baseURL: string, model: string) {
    this.client = new OpenAI({ apiKey, baseURL });
    this.model = model;
  }

  public async suggest(
    brokenSelector: string,
    description: string,
    pageContext: string,
  ): Promise<string[]> {
    const completion = await this.client.chat.completions.create({
      model: this.model,
      temperature: 0.1,
      max_tokens: 500,
      messages: [
        { role: 'system', content: BaseLlmProvider.SYSTEM_PROMPT },
        {
          role: 'user',
          content:
            `BROKEN SELECTOR: ${brokenSelector}\n` +
            `ELEMENT DESCRIPTION: ${description}\n\n` +
            `PAGE CONTEXT (HTML excerpt):\n${pageContext.slice(0, 12000)}\n\n` +
            `Suggest up to 5 alternative Playwright locators. Return ONLY a JSON array.`,
        },
      ],
    });
    const content = completion.choices[0]?.message?.content?.trim() ?? '[]';
    return HealingResponseParser.parse(content);
  }

  private static readonly SYSTEM_PROMPT = [
    'You are an expert Playwright test automation engineer specializing in resilient selectors.',
    'RULES:',
    '1. Output ONLY a valid JSON array of strings - no explanations, no markdown',
    '2. Prioritize: data-testid/data-cy > aria-label/role > id/name/placeholder > text selectors > stable CSS',
    '3. Never suggest nth-child, nth-of-type, or index-based positioning',
    '4. Every selector must be usable directly in page.locator(selector)',
  ].join('\n');
}

class DeepSeekProvider extends BaseLlmProvider {
  public readonly name = 'deepseek';
  public readonly priority = 1;
  public constructor() {
    super(
      process.env.DEEPSEEK_API_KEY ?? '',
      process.env.DEEPSEEK_BASE_URL ?? 'https://api.deepseek.com/v1',
      process.env.DEEPSEEK_MODEL ?? 'deepseek-chat',
    );
  }
}

class OpenAIProvider extends BaseLlmProvider {
  public readonly name = 'openai';
  public readonly priority = 2;
  public constructor() {
    super(
      process.env.OPENAI_API_KEY ?? '',
      process.env.OPENAI_BASE_URL ?? 'https://api.openai.com/v1',
      process.env.OPENAI_MODEL ?? 'gpt-4o-mini',
    );
  }
}

class AnthropicProvider extends BaseLlmProvider {
  public readonly name = 'anthropic';
  public readonly priority = 3;
  public constructor() {
    super(
      process.env.ANTHROPIC_API_KEY ?? '',
      process.env.ANTHROPIC_BASE_URL ?? 'https://api.anthropic.com/v1',
      process.env.ANTHROPIC_MODEL ?? 'claude-3-haiku-20240307',
    );
  }
}

class CustomProvider extends BaseLlmProvider {
  public readonly name = 'custom';
  public readonly priority = 4;
  public constructor() {
    super(
      process.env.CUSTOM_LLM_API_KEY ?? '',
      process.env.CUSTOM_LLM_BASE_URL ?? 'http://localhost:11434/v1',
      process.env.CUSTOM_LLM_MODEL ?? 'local-model',
    );
  }
}

/** Factory: build the fallback chain from whatever keys exist (may be empty). */
class ProviderFactory {
  public static fromEnv(): BaseLlmProvider[] {
    const providers: BaseLlmProvider[] = [];
    if (process.env.DEEPSEEK_API_KEY) {
      providers.push(new DeepSeekProvider());
    }
    if (process.env.OPENAI_API_KEY) {
      providers.push(new OpenAIProvider());
    }
    if (process.env.ANTHROPIC_API_KEY) {
      providers.push(new AnthropicProvider());
    }
    if (process.env.CUSTOM_LLM_API_KEY && process.env.CUSTOM_LLM_BASE_URL) {
      providers.push(new CustomProvider());
    }
    return providers.sort((a, b) => a.priority - b.priority);
  }
}

// ---------------------------------------------------------------------------
// Helpers (single-responsibility classes)
// ---------------------------------------------------------------------------

class HealingResponseParser {
  public static parse(content: string): string[] {
    const cleaned = content.trim();
    const attempts: string[] = [cleaned];
    const codeBlock = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (codeBlock) {
      attempts.push(codeBlock[1].trim());
    }
    const arrayMatch = cleaned.match(/\[[\s\S]*?\]/);
    if (arrayMatch) {
      attempts.push(arrayMatch[0]);
    }
    for (const candidate of attempts) {
      try {
        const parsed: unknown = JSON.parse(candidate);
        if (Array.isArray(parsed)) {
          return parsed.filter((s): s is string => typeof s === 'string');
        }
      } catch {
        // try next candidate
      }
    }
    logger.error(`Failed to parse LLM healing response: ${content.slice(0, 200)}`);
    return [];
  }
}

/**
 * Offline heuristic — works with zero API keys.
 * Turns a broken selector + human description into cheap alternatives
 * (text, aria, placeholder, test-id guesses + CSS relaxations).
 */
class HeuristicHealer {
  public static suggest(brokenSelector: string, description: string): string[] {
    const out: string[] = [];
    const desc = description.trim();
    const broken = brokenSelector.trim();

    if (desc.length > 1) {
      out.push(`text=${desc}`);
      out.push(`button:has-text("${desc}")`);
      out.push(`a:has-text("${desc}")`);
      out.push(`[aria-label="${desc}"]`);
      out.push(`[placeholder="${desc}"]`);
      const testId = desc
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');
      if (testId.length > 1) {
        out.push(`[data-testid="${testId}"]`);
      }
    }

    // CSS relaxations: "#id.cls" -> "[id=...]", ".a.b" -> ".a", etc.
    const idMatch = broken.match(/#([A-Za-z0-9_-]+)/);
    if (idMatch) {
      out.push(`[id="${idMatch[1]}"]`);
    }
    const classMatches = broken.match(/\.[A-Za-z0-9_-]+/g);
    if (classMatches && classMatches.length > 1) {
      out.push(classMatches[0]);
      out.push(classMatches.join(''));
    }
    if (broken.includes('nth-child') || broken.includes('nth-of-type') || broken.includes(':nth')) {
      out.push(
        broken
          .replace(/:nth-[a-z-]+\([^)]*\)/g, '')
          .replace(/ +/g, ' ')
          .trim(),
      );
    }

    return [...new Set(out)].filter((s) => s.length > 0 && s !== broken).slice(0, 8);
  }
}

/** TTL + LRU cache so repeated failures don't spam the LLM. */
class HealingCache {
  private readonly store = new Map<string, HealingCacheEntry>();
  private readonly ttlMs: number;
  private readonly maxSize: number;

  public constructor(ttlMs = 30 * 60 * 1000, maxSize = 100) {
    this.ttlMs = ttlMs;
    this.maxSize = maxSize;
  }

  public get(selector: string): HealingCacheEntry | null {
    const entry = this.store.get(selector);
    if (!entry) {
      return null;
    }
    if (Date.now() - entry.timestamp > this.ttlMs) {
      this.store.delete(selector);
      return null;
    }
    entry.hitCount += 1;
    return entry;
  }

  public set(selector: string, healedSelector: string, provider: string): void {
    if (this.store.size >= this.maxSize) {
      const oldest = [...this.store.entries()].sort((a, b) => a[1].timestamp - b[1].timestamp)[0];
      if (oldest) {
        this.store.delete(oldest[0]);
      }
    }
    this.store.set(selector, {
      selector,
      healedSelector,
      provider,
      timestamp: Date.now(),
      hitCount: 1,
    });
  }

  public stats(): { size: number; entries: HealingCacheEntry[] } {
    return { size: this.store.size, entries: [...this.store.values()] };
  }

  public clear(): void {
    this.store.clear();
  }
}

// ---------------------------------------------------------------------------
// Facade (Singleton)
// ---------------------------------------------------------------------------

/**
 * AI self-healing facade.
 *
 * Flow: cache → offline heuristic → LLM chain (DeepSeek > OpenAI > Anthropic > local).
 * Master switch: SELF_HEALING_ENABLED=true. HEALING_MODE=post-mortem only logs.
 */
export class AiHealerService {
  private static instance: AiHealerService | null = null;

  private readonly cache = new HealingCache();
  private forcedEnabled: boolean | null = null;

  private constructor() {
    // lazy provider init per call (keys may arrive after import)
  }

  public static getInstance(): AiHealerService {
    if (AiHealerService.instance === null) {
      AiHealerService.instance = new AiHealerService();
    }
    return AiHealerService.instance;
  }

  /** Test override — forces ON/OFF regardless of env (passes lint, no process.exit). */
  public setEnabledOverride(value: boolean | null): void {
    this.forcedEnabled = value;
  }

  public isEnabled(): boolean {
    if (this.forcedEnabled !== null) {
      return this.forcedEnabled;
    }
    return env.selfHealingEnabled;
  }

  public async healSelector(
    page: Page,
    brokenSelector: string,
    elementDescription: string,
  ): Promise<HealingResult> {
    if (!this.isEnabled()) {
      return { healedSelector: null, usedSelector: brokenSelector, confidence: 0 };
    }
    if (env.healingMode === 'post-mortem') {
      logger.warn(`🩹 Post-mortem (no heal): ${elementDescription} [${brokenSelector}]`);
      return { healedSelector: null, usedSelector: brokenSelector, confidence: 0 };
    }

    const cached = this.cache.get(brokenSelector);
    if (cached && (await this.isSelectorValid(page, cached.healedSelector))) {
      logger.info(`💾 Healed from cache (${cached.provider}): ${cached.healedSelector}`);
      return {
        healedSelector: cached.healedSelector,
        usedSelector: cached.healedSelector,
        confidence: 1,
        provider: cached.provider,
        cached: true,
      };
    }

    logger.warn(`🩹 Healing: ${elementDescription} [${brokenSelector}]`);

    for (const suggestion of HeuristicHealer.suggest(brokenSelector, elementDescription)) {
      if (await this.isSelectorValid(page, suggestion)) {
        logger.info(`✨ Healed via heuristic: ${suggestion}`);
        this.cache.set(brokenSelector, suggestion, 'heuristic');
        return {
          healedSelector: suggestion,
          usedSelector: suggestion,
          confidence: 0.7,
          provider: 'heuristic',
        };
      }
    }

    const providers = ProviderFactory.fromEnv();
    if (providers.length === 0) {
      logger.warn(
        '⚠️ Healing: no LLM keys set — heuristic only (set DEEPSEEK/OPENAI key for full AI).',
      );
      return { healedSelector: null, usedSelector: brokenSelector, confidence: 0 };
    }

    const context = await this.capturePageContext(page);
    for (const provider of providers) {
      try {
        logger.info(`🤖 Healing via ${provider.name}...`);
        const suggestions = await provider.suggest(brokenSelector, elementDescription, context);
        for (const suggestion of suggestions) {
          if (await this.isSelectorValid(page, suggestion)) {
            logger.info(`✨ Healed via ${provider.name}: ${suggestion}`);
            this.cache.set(brokenSelector, suggestion, provider.name);
            return {
              healedSelector: suggestion,
              usedSelector: suggestion,
              confidence: 1,
              provider: provider.name,
            };
          }
        }
      } catch (err) {
        logger.warn(
          `⚠️ Provider ${provider.name} failed: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    }

    logger.warn('⚠️ Healing failed — no valid alternative found.');
    return { healedSelector: null, usedSelector: brokenSelector, confidence: 0 };
  }

  public getCacheStats(): { size: number; entries: HealingCacheEntry[] } {
    return this.cache.stats();
  }

  public clearCache(): void {
    this.cache.clear();
    logger.info('🗑️ Healing cache cleared');
  }

  private async isSelectorValid(page: Page, selector: string): Promise<boolean> {
    try {
      const locator = page.locator(selector);
      const count = await locator.count();
      if (count !== 1) {
        return false;
      }
      await locator.first().waitFor({ state: 'visible', timeout: 4000 });
      return true;
    } catch {
      return false;
    }
  }

  private async capturePageContext(page: Page): Promise<string> {
    const html = await page.evaluate(() => {
      const clone = document.body.cloneNode(true) as HTMLElement;
      clone.querySelectorAll('script, style, noscript').forEach((el) => el.remove());
      return clone.innerHTML;
    });
    const url = page.url();
    const title = await page.title();
    return `URL: ${url}\nTitle: ${title}\n\n${html}`;
  }
}

export const aiHealer = AiHealerService.getInstance();
