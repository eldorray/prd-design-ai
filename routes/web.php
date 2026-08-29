<?php

use App\Http\Controllers\Admin\AdminController;
use App\Http\Controllers\Admin\AiSettingController;
use App\Http\Controllers\AiModelController;
use App\Http\Controllers\DesignController;
use App\Http\Controllers\DesignExportController;
use App\Http\Controllers\DesignStreamController;
use App\Http\Controllers\PrdAssistantController;
use App\Http\Controllers\PrdController;
use Illuminate\Support\Facades\Route;

Route::inertia('/', 'welcome')->name('home');

Route::middleware(['auth'])->group(function () {
    Route::get('dashboard', [PrdController::class, 'index'])->name('dashboard');

    Route::post('prds', [PrdController::class, 'store'])->name('prds.store');
    Route::put('prds/{prd}', [PrdController::class, 'update'])->name('prds.update');
    Route::delete('prds/{prd}', [PrdController::class, 'destroy'])->name('prds.destroy');

    Route::post('prd-assistant/messages', PrdAssistantController::class)
        ->middleware('throttle:ai')
        ->name('prd-assistant.messages');

    Route::get('ai/models', AiModelController::class)->name('ai.models');

    Route::get('design', [DesignController::class, 'index'])->name('design.index');
    Route::post('designs', [DesignController::class, 'store'])->name('designs.store');
    Route::put('designs/{design}', [DesignController::class, 'update'])->name('designs.update');
    Route::delete('designs/{design}', [DesignController::class, 'destroy'])->name('designs.destroy');
    Route::get('designs/{design}/export', DesignExportController::class)->name('designs.export');

    Route::post('design-assistant/stream', DesignStreamController::class)
        ->middleware('throttle:ai')
        ->name('design-assistant.stream');

    Route::middleware(['admin'])->prefix('admin')->name('admin.')->group(function () {
        Route::get('dashboard', [AdminController::class, 'index'])->name('dashboard');
        Route::put('users/{user}', [AdminController::class, 'updateUser'])->name('users.update');
        Route::delete('users/{user}', [AdminController::class, 'destroyUser'])->name('users.destroy');

        Route::get('ai', [AiSettingController::class, 'index'])->name('ai.index');
        Route::post('ai/providers', [AiSettingController::class, 'storeProvider'])->name('ai.providers.store');
        Route::put('ai/providers/{provider}', [AiSettingController::class, 'updateProvider'])->name('ai.providers.update');
        Route::delete('ai/providers/{provider}', [AiSettingController::class, 'destroyProvider'])->name('ai.providers.destroy');
        Route::get('ai/providers/{provider}/models', [AiSettingController::class, 'models'])->name('ai.providers.models');
        Route::post('ai/prompts', [AiSettingController::class, 'storePrompt'])->name('ai.prompts.store');
        Route::put('ai/prompts/{prompt}', [AiSettingController::class, 'updatePrompt'])->name('ai.prompts.update');
        Route::delete('ai/prompts/{prompt}', [AiSettingController::class, 'destroyPrompt'])->name('ai.prompts.destroy');
    });
});

require __DIR__.'/settings.php';
