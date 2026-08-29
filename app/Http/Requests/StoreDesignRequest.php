<?php

namespace App\Http\Requests;

use App\Support\AiProvider;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreDesignRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'title' => ['required', 'string', 'max:120'],
            'prompt' => ['nullable', 'string', 'max:50000'],
            'kind' => ['required', 'string', Rule::in(['landing-page', 'dashboard', 'mobile-app'])],
            'model' => ['required', 'string', Rule::in(AiProvider::models())],
            'html' => ['nullable', 'string', 'max:120000'],
            'messages' => ['present', 'array', 'max:60'],
            'messages.*.role' => ['required', 'string', Rule::in(['user', 'assistant'])],
            'messages.*.content' => ['required', 'string', 'max:120000'],
            'canvases' => ['nullable', 'array', 'max:3'],
            'canvases.*.kind' => ['required', 'string', Rule::in(['landing-page', 'dashboard', 'mobile-app'])],
            'canvases.*.html' => ['nullable', 'string', 'max:120000'],
            'canvases.*.prompt' => ['nullable', 'string', 'max:50000'],
            'canvases.*.messages' => ['present', 'array', 'max:60'],
            'canvases.*.messages.*.role' => ['required', 'string', Rule::in(['user', 'assistant'])],
            'canvases.*.messages.*.content' => ['required', 'string', 'max:120000'],
        ];
    }
}
