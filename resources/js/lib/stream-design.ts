type StreamHandlers = {
    onChunk: (fullHtml: string) => void;
    onDone: (fullHtml: string) => void;
    onError: (message: string) => void;
};

type StreamRequest = {
    url: string;
    csrfToken: string;
    body: Record<string, unknown>;
    signal?: AbortSignal;
};

/**
 * Sanitize streamed HTML: strip leading reasoning / chatter some models
 * prepend (e.g. chain-of-thought or markdown code fences) so the canvas only
 * ever shows the actual HTML document.
 */
function stripFences(html: string): string {
    let result = html.trim();

    if (result.startsWith('```')) {
        result = result.replace(/^```[a-zA-Z]*\s*/, '');
        result = result.replace(/\s*```$/, '');
    }

    // Some reasoning models spill <think>...</think> blocks before the HTML.
    // Drop the entire block if present.
    result = result.replace(/<think>[\s\S]*?<\/think>/gi, '');

    // If anything still precedes <!doctype, hard-cut to the doctype.
    const doctypeIdx = result.toLowerCase().indexOf('<!doctype');

    if (doctypeIdx > 0) {
        result = result.slice(doctypeIdx);
    } else {
        // Fallback: some models omit doctype; cut to first <html.
        const htmlIdx = result.toLowerCase().indexOf('<html');

        if (htmlIdx > 0) {
            result = result.slice(htmlIdx);
        }
    }

    return result.trim();
}

/**
 * POST to a Server-Sent Events endpoint and parse `event:`/`data:` frames.
 * Accumulates streamed HTML deltas and reports progress as it arrives.
 */
export async function streamDesign(
    request: StreamRequest,
    handlers: StreamHandlers,
): Promise<void> {
    const response = await fetch(request.url, {
        method: 'POST',
        headers: {
            Accept: 'text/event-stream',
            'Content-Type': 'application/json',
            'X-CSRF-TOKEN': request.csrfToken,
        },
        body: JSON.stringify(request.body),
        signal: request.signal,
    });

    if (!response.ok || !response.body) {
        let message = 'Design belum bisa dibuat. Coba lagi.';

        try {
            const data = await response.json();

            if (data && typeof data.message === 'string') {
                message = data.message;
            }
        } catch {
            // Fall back to default message
        }

        handlers.onError(message);

        return;
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let fullHtml = '';

    const handleEvent = (rawEvent: string) => {
        const lines = rawEvent.split('\n');
        let eventName = 'message';
        let dataText = '';

        for (const line of lines) {
            // Tolerate CRLF line endings, which the SSE spec allows.
            const normalized = line.endsWith('\r') ? line.slice(0, -1) : line;

            if (normalized.startsWith('event:')) {
                eventName = normalized.slice(6).trim();
            } else if (normalized.startsWith('data:')) {
                // Per the SSE spec, multiple data lines join with '\n'.
                dataText += (dataText ? '\n' : '') + normalized.slice(5).replace(/^ /, '');
            }
        }

        if (eventName === 'chunk') {
            if (!dataText) {
                return;
            }

            let data: { delta?: string };

            try {
                data = JSON.parse(dataText);
            } catch {
                return;
            }

            if (typeof data.delta === 'string') {
                fullHtml += data.delta;
                handlers.onChunk(stripFences(fullHtml));
            }
        } else if (eventName === 'done') {
            handlers.onDone(stripFences(fullHtml));
        } else if (eventName === 'error') {
            let message = 'Generate design gagal.';

            try {
                message = (JSON.parse(dataText).message as string) ?? message;
            } catch {
                // keep default message
            }

            handlers.onError(message);
        }
    };

    // Frames are separated by a blank line (\n\n, or \r\n\r\n per the SSE spec).
    const nextSeparator = (buf: string): number => {
        const lf = buf.indexOf('\n\n');
        const crlf = buf.indexOf('\r\n\r\n');

        if (lf === -1) {
return crlf;
}

        if (crlf === -1) {
return lf;
}

        return Math.min(lf, crlf);
    };

    for (;;) {
        const { done, value } = await reader.read();

        if (done) {
            break;
        }

        buffer += decoder.decode(value, { stream: true });

        let separator = nextSeparator(buffer);

        while (separator !== -1) {
            const rawEvent = buffer.slice(0, separator);
            buffer = buffer.slice(separator + separatorLength(buffer, separator));
            handleEvent(rawEvent);
            separator = nextSeparator(buffer);
        }
    }

    // Some servers close the stream right after the last event without a
    // trailing blank line — flush whatever is left or the final done/error
    // frame (and its HTML) is silently dropped.
    if (buffer.trim() !== '') {
        handleEvent(buffer);
    }
}

/** Length (2 for \n\n, 4 for \r\n\r\n) of the separator at the given index. */
function separatorLength(buf: string, index: number): number {
    return buf.startsWith('\r\n\r\n', index) ? 4 : 2;
}
