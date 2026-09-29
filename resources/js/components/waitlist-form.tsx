import { useForm } from '@inertiajs/react';
import { ArrowRight, Check } from 'lucide-react';
import { useState } from 'react';

import WaitlistController from '@/actions/App/Http/Controllers/WaitlistController';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

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
            <div className="border-border/70 bg-card/60 mx-auto flex max-w-md items-center gap-3 rounded-2xl border px-5 py-4 text-left text-sm">
                <div className="bg-primary/10 text-primary flex size-9 shrink-0 items-center justify-center rounded-full">
                    <Check className="size-4" />
                </div>
                Kamu sudah masuk daftar tunggu. Kami kabari lewat email saat
                akunmu siap.
            </div>
        );
    }

    return (
        <form
            onSubmit={submit}
            className="mx-auto grid w-full max-w-md gap-3 text-left"
        >
            <div className="grid gap-1.5">
                <Label htmlFor="waitlist-email">Email</Label>
                <Input
                    id="waitlist-email"
                    type="email"
                    autoComplete="email"
                    placeholder="kamu@email.com"
                    value={form.data.email}
                    onChange={(e) => form.setData('email', e.target.value)}
                    required
                />
                <InputError message={form.errors.email} />
            </div>
            <div className="grid gap-1.5">
                <Label htmlFor="waitlist-name">Nama (opsional)</Label>
                <Input
                    id="waitlist-name"
                    autoComplete="name"
                    value={form.data.name}
                    onChange={(e) => form.setData('name', e.target.value)}
                />
                <InputError message={form.errors.name} />
            </div>
            <div className="grid gap-1.5">
                <Label htmlFor="waitlist-note">
                    Produk apa yang ingin kamu buat? (opsional)
                </Label>
                <Textarea
                    id="waitlist-note"
                    rows={3}
                    maxLength={1000}
                    value={form.data.note}
                    onChange={(e) => form.setData('note', e.target.value)}
                />
                <InputError message={form.errors.note} />
            </div>
            <Button
                type="submit"
                size="lg"
                disabled={form.processing}
                className="shadow-primary/25 group mt-1 rounded-full shadow-xl"
            >
                {form.processing ? 'Mengirim...' : 'Masuk daftar tunggu'}
                <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
            </Button>
        </form>
    );
}
