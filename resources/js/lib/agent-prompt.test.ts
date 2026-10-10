import { describe, expect, it } from 'vitest';

import { buildAgentPrompt } from '@/lib/agent-prompt';

describe('buildAgentPrompt', () => {
    it('fences the whole PRD as data after the working instructions', () => {
        const prompt = buildAgentPrompt(
            '\n# Kasir Kopi\n\n## Task Breakdown\n- [ ] Setup\n',
        );

        expect(prompt).toContain(
            '<prd>\n# Kasir Kopi\n\n## Task Breakdown\n- [ ] Setup\n</prd>',
        );
        expect(prompt.indexOf('Cara kerja:')).toBeLessThan(
            prompt.indexOf('\n<prd>\n'),
        );
    });

    it('points the agent at the template sections it works from', () => {
        const prompt = buildAgentPrompt('# P');

        for (const section of [
            'Task Breakdown',
            'Acceptance Criteria',
            'Rekomendasi Tech Stack',
            'Non-Scope MVP',
        ]) {
            expect(prompt).toContain(`"${section}"`);
        }
    });
});
