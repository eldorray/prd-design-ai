export type PrdMessage = {
    role: 'assistant' | 'user';
    content: string;
};

export type PrdSummary = {
    id: string;
    title: string;
    model: string;
    updated_at: string;
};

export type Prd = {
    id: string;
    title: string;
    idea: string | null;
    model: string;
    content: string | null;
    messages: PrdMessage[];
    created_at: string;
    updated_at: string;
};
