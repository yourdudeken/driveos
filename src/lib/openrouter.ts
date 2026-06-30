import { logger } from '@/lib/logger';

/**
 * All AI calls go through the /api/ai Vercel Function.
 * The OpenRouter API key lives exclusively in the server environment —
 * it is never inlined into the browser bundle.
 */
const PROXY_URL = '/api/ai';

async function callProxy(messages: { role: string; content: string }[], maxTokens = 200): Promise<string> {
    const response = await fetch(PROXY_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages, maxTokens }),
    });

    if (!response.ok) {
        logger.error('AI proxy error', { status: response.status });
        throw new Error(`AI proxy error: ${response.status}`);
    }

    const data = await response.json() as { content?: string; error?: string };
    if (data.error) throw new Error(data.error);
    return data.content ?? '';
}

/** Inline field autocomplete suggestions (used while the user is typing). */
export async function getSuggestions(field: string, input: string): Promise<string[]> {
    if (!input.trim() || input.length < 2) return [];

    const systemPrompt = `You are a task management assistant. Given the user's current input for "${field}", suggest concise completions. Return a JSON array of exactly 3 strings. Keep each suggestion under 5 words. Only respond with valid JSON, no other text.`;

    try {
        const content = await callProxy([
            { role: 'system', content: systemPrompt },
            { role: 'user', content: input },
        ], 100);

        const parsed = JSON.parse(content);
        return Array.isArray(parsed) ? parsed.slice(0, 3) : [];
    } catch {
        return [];
    }
}

export interface GeneratedTask {
    title: string;
    description: string;
    priority: 1 | 2 | 3;
    categories: string;
    dueDate: string;
}

/**
 * Given a natural-language prompt, generate a fully-structured task.
 * Returns a JSON object with title, description, priority (1=High/2=Med/3=Low),
 * categories (comma-separated string), and dueDate (YYYY-MM-DD or empty string).
 */
export async function generateTaskFromPrompt(prompt: string): Promise<GeneratedTask> {
    const today = new Date().toISOString().split('T')[0];

    const systemPrompt = `You are a task management assistant. The user will describe a task in plain language. Your job is to extract a structured task from their description.

Today's date is ${today}.

Return ONLY valid JSON (no markdown, no explanation) with exactly these fields:
{
  "title": "short imperative task title (max 8 words)",
  "description": "one or two sentence description",
  "priority": 1 or 2 or 3,  // 1=High, 2=Medium, 3=Low
  "categories": "comma-separated categories e.g. Work, Urgent",
  "dueDate": "YYYY-MM-DD or empty string if not mentioned"
}`;

    const content = await callProxy([
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt },
    ], 300);

    // Strip potential markdown code fences
    const clean = content.replace(/```json?\n?/g, '').replace(/```/g, '').trim();
    const parsed = JSON.parse(clean);

    return {
        title: String(parsed.title ?? ''),
        description: String(parsed.description ?? ''),
        priority: ([1, 2, 3].includes(Number(parsed.priority)) ? Number(parsed.priority) : 2) as 1 | 2 | 3,
        categories: String(parsed.categories ?? ''),
        dueDate: String(parsed.dueDate ?? ''),
    };
}
