import type { VercelRequest, VercelResponse } from '@vercel/node';

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';

// Simple request-shape validation — no external deps needed.
function isValidMessages(value: unknown): value is { role: string; content: string }[] {
    if (!Array.isArray(value) || value.length === 0) return false;
    return value.every(
        (m) =>
            typeof m === 'object' &&
            m !== null &&
            typeof (m as Record<string, unknown>).role === 'string' &&
            typeof (m as Record<string, unknown>).content === 'string',
    );
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
    // Only accept POST requests.
    if (req.method !== 'POST') {
        res.setHeader('Allow', 'POST');
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
        // Misconfigured deployment — do not leak env detail to client.
        return res.status(500).json({ error: 'AI service not configured' });
    }

    const { messages, maxTokens } = req.body as {
        messages?: unknown;
        maxTokens?: unknown;
    };

    if (!isValidMessages(messages)) {
        return res.status(400).json({ error: 'Invalid messages payload' });
    }

    const safeMaxTokens =
        typeof maxTokens === 'number' && maxTokens > 0 && maxTokens <= 1000
            ? maxTokens
            : 200;

    try {
        const upstream = await fetch(OPENROUTER_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${apiKey}`,
                // OpenRouter requires a referrer/title so usage appears on their dashboard.
                'HTTP-Referer': process.env.VERCEL_URL
                    ? `https://${process.env.VERCEL_URL}`
                    : 'https://driveos.app',
                'X-Title': 'DriveOS',
            },
            body: JSON.stringify({
                model: 'openrouter/auto',
                messages,
                temperature: 0.7,
                max_tokens: safeMaxTokens,
            }),
        });

        if (!upstream.ok) {
            const text = await upstream.text();
            return res
                .status(upstream.status)
                .json({ error: `Upstream error: ${upstream.status}`, detail: text });
        }

        const data = await upstream.json() as { choices?: { message?: { content?: string } }[] };
        const content = data.choices?.[0]?.message?.content ?? '';
        return res.status(200).json({ content });
    } catch {
        return res.status(502).json({ error: 'Failed to reach AI service' });
    }
}
