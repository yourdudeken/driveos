const API_URL = 'https://api.openai.com/v1/chat/completions';

function getApiKey(): string {
    const key = import.meta.env.VITE_OPENAI_API_KEY;
    if (!key) throw new Error('VITE_OPENAI_API_KEY not configured');
    return key;
}

export async function getSuggestions(field: string, input: string): Promise<string[]> {
    if (!input.trim() || input.length < 2) return [];

    const systemPrompt = `You are a task management assistant. Given the user's current input for "${field}", suggest concise completions. Return a JSON array of exactly 3 strings. Keep each suggestion under 5 words. Only respond with valid JSON, no other text.`;

    const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${getApiKey()}`,
        },
        body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: input },
            ],
            temperature: 0.7,
            max_tokens: 100,
        }),
    });

    if (!response.ok) {
        console.error('OpenAI API error:', response.status, await response.text());
        return [];
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) return [];

    try {
        const parsed = JSON.parse(content);
        return Array.isArray(parsed) ? parsed.slice(0, 3) : [];
    } catch {
        return [];
    }
}
