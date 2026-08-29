function slugify(value: string) {
    return (
        value
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/(^-|-$)/g, '') || 'design'
    );
}

function triggerDownload(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');

    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    URL.revokeObjectURL(url);
}

/**
 * Download a generated design. Currently supports the single-file HTML export;
 * the separated ZIP export is produced server-side via the export route.
 */
export function exportDesign(html: string, title: string, format: 'html') {
    const name = slugify(title);

    if (format === 'html') {
        triggerDownload(
            new Blob([html], { type: 'text/html;charset=utf-8' }),
            `${name}.html`,
        );
    }
}
