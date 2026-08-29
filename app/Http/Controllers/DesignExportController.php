<?php

namespace App\Http\Controllers;

use App\Models\Design;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Symfony\Component\HttpFoundation\BinaryFileResponse;
use ZipArchive;

class DesignExportController extends Controller
{
    /**
     * Export a design as a ZIP archive with separated HTML, CSS and JS files.
     */
    public function __invoke(Request $request, Design $design): BinaryFileResponse
    {
        abort_unless($design->user_id === $request->user()->id, 403);
        abort_if(blank($design->html), 404, 'Design belum punya konten.');

        // Legacy rows can still carry the injected visual-edit bridge (it
        // accumulated there before request-html learned to strip it). Never
        // ship it inside an export — raw in a browser it blocks every link
        // and form in the document.
        $sourceHtml = preg_replace(
            '/<script\b[^>]*data-design-edit-bridge[^>]*>[\s\S]*?<\/script>/i',
            '',
            (string) $design->html,
        ) ?? (string) $design->html;

        $split = $this->splitHtml($sourceHtml);

        $slug = Str::slug($design->title) ?: 'design';
        $zipPath = tempnam(sys_get_temp_dir(), 'design_').'.zip';

        $zip = new ZipArchive;

        // Without this check a failed open() turns every addFromString() below
        // into a no-op and the user downloads an empty file.
        abort_unless(
            $zip->open($zipPath, ZipArchive::CREATE | ZipArchive::OVERWRITE) === true,
            500,
            'Gagal menyiapkan arsip export.',
        );

        $zip->addFromString('index.html', $split['html']);

        if ($split['css'] !== '') {
            $zip->addFromString('style.css', $split['css']);
        }

        if ($split['js'] !== '') {
            $zip->addFromString('script.js', $split['js']);
        }

        $zip->close();

        return response()
            ->download($zipPath, $slug.'.zip', [
                'Content-Type' => 'application/zip',
            ])
            ->deleteFileAfterSend();
    }

    /**
     * Split a single-file HTML document into html, css, and js parts.
     *
     * @return array{html: string, css: string, js: string}
     */
    private function splitHtml(string $document): array
    {
        $css = '';
        $js = '';

        // Extract and remove inline <style> blocks.
        $html = preg_replace_callback(
            '/<style\b[^>]*>(.*?)<\/style>/is',
            function (array $matches) use (&$css): string {
                $css .= trim($matches[1])."\n";

                return '';
            },
            $document,
        ) ?? $document;

        // Extract and remove inline <script> blocks that have no src attribute.
        $html = preg_replace_callback(
            '/<script\b(?![^>]*\bsrc=)[^>]*>(.*?)<\/script>/is',
            function (array $matches) use (&$js): string {
                $js .= trim($matches[1])."\n";

                return '';
            },
            (string) $html,
        ) ?? $html;

        $links = [];

        if (trim($css) !== '') {
            $links[] = '    <link rel="stylesheet" href="style.css">';
        }

        if (trim($css) !== '' && str_contains((string) $html, '</head>')) {
            $html = str_replace('</head>', implode("\n", $links)."\n</head>", (string) $html);
            $links = [];
        }

        $scripts = [];

        if (trim($js) !== '') {
            $scripts[] = '    <script src="script.js"></script>';
        }

        if (! empty($scripts) && str_contains((string) $html, '</body>')) {
            $html = str_replace('</body>', implode("\n", $scripts)."\n</body>", (string) $html);
            $scripts = [];
        }

        // Fallbacks when the document lacks </head> or </body>.
        $remaining = array_merge($links, $scripts);

        if (! empty($remaining)) {
            $html .= "\n".implode("\n", $remaining);
        }

        return [
            'html' => trim((string) $html)."\n",
            'css' => trim($css),
            'js' => trim($js),
        ];
    }
}
