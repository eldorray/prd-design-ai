export type Model = string;

const MODEL_LABELS: Record<string, string> = {
    'deepseek-v4-flash': 'DeepSeek V4 Flash',
    'deepseek-v4-pro': 'DeepSeek V4 Pro',
    'gemini-3.5-flash': 'Gemini 3.5 Flash',
    'gemini-3.1-pro-preview': 'Gemini 3.1 Pro',
    'MiniMax-M3': 'MiniMax M3',
};

export const modelLabel = (model: string): string =>
    MODEL_LABELS[model] ?? model;
