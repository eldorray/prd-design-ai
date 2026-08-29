<?php

namespace App\Http\Requests;

use App\Support\AiProvider;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class DesignAssistantRequest extends FormRequest
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
            'model' => ['required', 'string', Rule::in(AiProvider::models())],
            'mode' => ['required', 'string', Rule::in(['generate', 'refine'])],
            'kind' => ['required', 'string', Rule::in(['landing-page', 'dashboard', 'mobile-app'])],
            'prompt' => ['required', 'string', 'max:50000'],
            'current_html' => ['nullable', 'string', 'max:120000'],
            // Base64 vision payload; ~8M chars ≈ 6 MB binary, matching the
            // provider's vision upload ceiling.
            'image' => ['nullable', 'string', 'max:8000000'],
        ];
    }
}
