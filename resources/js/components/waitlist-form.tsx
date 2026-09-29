import { useForm } from '@inertiajs/react';
import { ArrowRight, Check } from 'lucide-react';
import { useState } from 'react';

import WaitlistController from '@/actions/App/Http/Controllers/WaitlistController';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

// Field labels follow the mono metadata style used across the paper skin.
const FIELD_LABEL =
    'font-mono text-[11px] font-normal tracking-[0.08em] text-muted-foreground uppercase';

export default function WaitlistForm() {
    const [joined, setJoined] = useState(false);
    const form = useForm({ email: '', name: '', note: '' });

    const submit = (event: React.FormEvent) => {
        event.preventDefault();

        form.post(WaitlistController.store.url(), {
            preserveScroll: true,
            onSuccess: () => {
                form.reset();
                setJoined(true);
            },
        });
    };

    if (joined) {
        return (
            <div
                role="status"
                className="flex w-full max-w-md items-start gap-3 rounded-lg border border-border bg-card px-5 py-4 text-sm leading-relaxed"
            >
                <Check aria-hidden className="mt-0.5 size-4 shrink-0" />
                Kamu sudah masuk daftar tunggu. Kami kabari lewat email saat
                akunmu siap.
            </div>
        );
    }

    return (
        <form onSubmit={submit} className="grid w-full max-w-md gap-4">
            <div className="grid gap-2">
                <Label htmlFor="waitlist-email" className={FIELD_LABEL}>
                    Email
                </Label>
                <Input
                    id="waitlist-email"
                    type="email"
                    autoComplete="email"
                    placeholder="kamu@email.com"
                    value={form.data.email}
                    onChange={(e) => form.setData('email', e.target.value)}
                    className="h-11 bg-card"
                    required
                />
                <InputError message={form.errors.email} />
            </div>
            <div className="grid gap-2">
                <Label htmlFor="waitlist-name" className={FIELD_LABEL}>
                    Nama (opsional)
                </Label>
                <Input
                    id="waitlist-name"
                    autoComplete="name"
                    value={form.data.name}
                    onChange={(e) => form.setData('name', e.target.value)}
                    className="h-11 bg-card"
                />
                <InputError message={form.errors.name} />
            </div>
            <div className="grid gap-2">
                <Label htmlFor="waitlist-note" className={FIELD_LABEL}>
                    Produk apa yang ingin kamu buat? (opsional)
                </Label>
                <Textarea
                    id="waitlist-note"
                    rows={3}
                    maxLength={1000}
                    value={form.data.note}
                    onChange={(e) => form.setData('note', e.target.value)}
                    className="bg-card dark:bg-card"
                />
                <InputError message={form.errors.note} />
            </div>
            <Button
                type="submit"
                size="lg"
                disabled={form.processing}
                className="group mt-1 h-12 w-full gap-3 rounded-lg text-base"
            >
                {form.processing ? 'Mengirim...' : 'Masuk daftar tunggu'}
                <ArrowRight
                    aria-hidden
                    strokeWidth={1.75}
                    className="size-[18px] transition-transform group-hover:translate-x-0.5"
                />
            </Button>
        </form>
    );
}
