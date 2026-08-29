<?php

namespace App\Http\Requests;

use App\Support\AiProvider;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StorePrdRequest extends FormRequest
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
            'idea' => ['nullable', 'string', 'max:50000'],
            'model' => ['required', 'string', Rule::in(AiProvider::models())],
            'content' => ['nullable', 'string', 'max:50000'],
            'messages' => ['present', 'array', 'max:60'],
            'messages.*.role' => ['required', 'string', Rule::in(['user', 'assistant'])],
            'messages.*.content' => ['required', 'string', 'max:12000'],
        ];
    }
}
