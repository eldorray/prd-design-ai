<?php

namespace App\Http\Requests;

use App\Support\AiProvider;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class PrdAssistantRequest extends FormRequest
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
            'mode' => ['required', 'string', Rule::in(['interview', 'generate', 'refine'])],
            'idea' => ['nullable', 'string', 'max:50000'],
            'draft' => ['nullable', 'string', 'max:50000'],
            'messages' => ['required', 'array', 'min:1', 'max:30'],
            'messages.*.role' => ['required', 'string', Rule::in(['user', 'assistant'])],
            'messages.*.content' => ['required', 'string', 'max:12000'],
        ];
    }
}
