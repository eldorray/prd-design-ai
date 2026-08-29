import { Head, Link, usePage } from '@inertiajs/react';
import {
    ArrowRight,
    Check,
    Command,
    Download,
    FileText,
    History,
    Layers,
    LayoutDashboard,
    Lightbulb,
    MessageCircle,
    Smartphone,
    Sparkles,
    Target,
    Wand2,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { dashboard, login } from '@/routes';
import type { Auth } from '@/types';

type PageProps = {
    auth: Auth;
    [key: string]: unknown;
};

const MARQUEE_ITEMS = [
    'Solo founder',
    'Indie hacker',
    'Product manager',
    'Non-technical founder',
    'Freelancer',
    'Startup team',
    'AI coding tools',
    'Agency kecil',
];

const STEPS = [
    {
        icon: Lightbulb,
        title: 'Tulis ide',
        body: 'Mulai dari ide mentah. Cukup ceritakan produk apa yang ingin kamu buat.',
    },
    {
        icon: MessageCircle,
        title: 'Wawancara AI',
        body: 'AI menggali MVP secara interaktif dengan satu pertanyaan setiap kalinya.',
    },
    {
        icon: FileText,
        title: 'Terbitkan PRD',
        body: 'Spesifikasi produk lengkap otomatis terstruktur dalam format Markdown.',
    },
    {
        icon: Layers,
        title: 'Rancang Desain UI',
        body: 'Satu klik untuk generate layout dan mockup halaman web interaktif berbasis PRD.',
    },
];

const PRD_SECTIONS = [
    'Ringkasan',
    'Masalah',
    'Target User',
    'Scope MVP',
    'Fitur Utama',
    'User Flow',
];

export default function Welcome() {
    const { auth } = usePage<PageProps>().props;
    const primaryHref = auth.user ? dashboard() : login();

    return (
        <>
            <Head title="Home" />

            <div className="bg-background text-foreground relative min-h-screen overflow-hidden">
                <Aurora />

                <header className="border-border/60 bg-background/60 sticky top-0 z-30 border-b backdrop-blur-xl">
                    <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-5 py-3 md:px-8">
                        <div className="flex items-center gap-2.5">
                            <div className="bg-primary text-primary-foreground shadow-primary/20 flex size-9 items-center justify-center rounded-xl shadow-lg">
                                <Sparkles className="size-4" />
                            </div>
                            <span className="font-semibold tracking-tight">
                                PRD<span className="text-primary">.ai</span>
                            </span>
                        </div>

                        <nav className="flex items-center gap-2">
                            {auth.user ? (
                                <Button asChild className="rounded-full">
                                    <Link href={dashboard()}>
                                        Buka workspace
                                        <ArrowRight className="size-4" />
                                    </Link>
                                </Button>
                            ) : (
                                <Button
                                    asChild
                                    className="shadow-primary/20 rounded-full shadow-lg"
                                >
                                    <Link href={login()}>
                                        Masuk
                                        <ArrowRight className="size-4" />
                                    </Link>
                                </Button>
                            )}
                        </nav>
                    </div>
                </header>

                <main className="relative z-10">
                    {/* Hero */}
                    <section className="relative">
                        <div
                            aria-hidden
                            className="bg-grid pointer-events-none absolute inset-0 -z-10"
                        />
                        <div className="mx-auto w-full max-w-6xl px-5 pb-12 pt-16 text-center md:px-8 md:pb-16 md:pt-24">
                            <div className="animate-rise border-border/70 bg-card/60 text-muted-foreground mx-auto inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-sm backdrop-blur-md">
                                <span className="relative flex size-2">
                                    <span className="bg-primary/60 absolute inline-flex size-full animate-ping rounded-full" />
                                    <span className="bg-primary relative inline-flex size-2 rounded-full" />
                                </span>
                                AI PRD & Design Studio · Bahasa Indonesia
                            </div>

                            <h1
                                className="animate-rise mx-auto mt-7 max-w-4xl text-5xl font-semibold tracking-tight md:text-7xl"
                                style={{ animationDelay: '0.05s' }}
                            >
                                Jelaskan idemu, AI tulis PRD &{' '}
                                <span className="text-gradient">
                                    buat desain UI-nya
                                </span>
                            </h1>

                            <p
                                className="animate-rise text-muted-foreground mx-auto mt-6 max-w-2xl text-lg leading-8"
                                style={{ animationDelay: '0.1s' }}
                            >
                                Ubah ide produk mentah menjadi dokumen
                                spesifikasi (PRD) lengkap sekaligus mockup
                                antarmuka pengguna (UI design) interaktif dalam
                                hitungan menit. Siap ekspor untuk developer.
                            </p>

                            <div
                                className="animate-rise mt-9 flex flex-wrap justify-center gap-3"
                                style={{ animationDelay: '0.15s' }}
                            >
                                <Button
                                    asChild
                                    size="lg"
                                    className="shadow-primary/25 group rounded-full px-7 shadow-xl"
                                >
                                    <Link href={primaryHref}>
                                        {auth.user
                                            ? 'Buka workspace'
                                            : 'Masuk ke workspace'}
                                        <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
                                    </Link>
                                </Button>
                                <Button
                                    asChild
                                    size="lg"
                                    variant="outline"
                                    className="border-border/70 bg-card/50 rounded-full px-7 backdrop-blur-md"
                                >
                                    <Link
                                        href={auth.user ? dashboard() : login()}
                                    >
                                        <Command className="size-4" />
                                        Lihat contoh hasil
                                    </Link>
                                </Button>
                            </div>

                            <p
                                className="animate-rise text-muted-foreground mt-4 text-sm"
                                style={{ animationDelay: '0.18s' }}
                            >
                                Gratis dimulai · Tanpa kartu kredit · Hasil
                                dalam hitungan menit
                            </p>

                            <div
                                className="animate-rise mt-14"
                                style={{ animationDelay: '0.2s' }}
                            >
                                <HeroPreview />
                            </div>
                        </div>
                    </section>

                    {/* Marquee */}
                    <section className="border-border/60 bg-card/30 border-y py-5 backdrop-blur-sm">
                        <p className="text-muted-foreground mb-4 text-center text-xs font-medium uppercase tracking-[0.18em]">
                            Dibuat untuk
                        </p>
                        <Marquee />
                    </section>

                    {/* How it works */}
                    <section className="mx-auto w-full max-w-6xl px-5 py-16 md:px-8 md:py-24">
                        <div className="mx-auto max-w-2xl text-center">
                            <p className="text-primary text-xs font-medium uppercase tracking-[0.18em]">
                                Alur kerja
                            </p>
                            <h2 className="mt-2 text-3xl font-semibold tracking-tight md:text-4xl">
                                Dari ide mentah ke desain nyata
                            </h2>
                        </div>

                        <div className="relative mt-12 grid gap-5 md:grid-cols-4">
                            <div className="via-border absolute left-[12%] right-[12%] top-16 hidden h-px bg-gradient-to-r from-transparent to-transparent md:block" />
                            {STEPS.map((step, index) => (
                                <div
                                    key={step.title}
                                    className="border-border/70 bg-card/60 hover:border-primary/40 hover:shadow-primary/5 group relative rounded-2xl border p-6 backdrop-blur-md transition hover:-translate-y-1 hover:shadow-xl"
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground flex size-12 items-center justify-center rounded-xl transition">
                                            <step.icon className="size-5" />
                                        </div>
                                        <span className="from-foreground/20 bg-gradient-to-b to-transparent bg-clip-text text-4xl font-bold text-transparent">
                                            {String(index + 1).padStart(2, '0')}
                                        </span>
                                    </div>
                                    <h3 className="mt-5 text-lg font-semibold">
                                        {step.title}
                                    </h3>
                                    <p className="text-muted-foreground mt-2 text-sm leading-6">
                                        {step.body}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </section>

                    {/* Bento features */}
                    <section className="mx-auto w-full max-w-6xl px-5 pb-16 md:px-8 md:pb-24">
                        <div className="mx-auto mb-12 max-w-2xl text-center">
                            <p className="text-primary text-xs font-medium uppercase tracking-[0.18em]">
                                Fitur & Kemampuan
                            </p>
                            <h2 className="mt-2 text-3xl font-semibold tracking-tight md:text-4xl">
                                Hubungkan PRD & Rancang Desain UI
                            </h2>
                        </div>

                        <div className="grid auto-rows-[220px] grid-cols-1 gap-4 md:grid-cols-3">
                            <BentoCard
                                className="md:col-span-2 md:row-span-1"
                                icon={Wand2}
                                title="Ubah PRD Jadi Desain UI"
                                body="Satu klik untuk merancang mockup halaman website atau aplikasi langsung dari spesifikasi PRD Anda. Pilih jenis halaman seperti Landing Page, Dashboard admin, atau Mobile App mockup."
                                accent
                            />
                            <BentoCard
                                icon={Target}
                                title="Fokus Scope MVP"
                                body="Memisahkan scope dari non-scope dokumen spesifikasi agar pengerjaan tetap efisien."
                            />
                            <BentoCard
                                icon={Command}
                                title="Visual & Code Editor"
                                body="Modifikasi teks, font, dan warna langsung pada elemen canvas, atau salin kode HTML mentahnya."
                            />
                            <BentoCard
                                icon={History}
                                title="Riwayat & Switcher Versi"
                                body="Kembali ke versi revisi sebelumnya secara visual, bandingkan perubahan, dan branch kapan pun diinginkan."
                            />
                            <BentoCard
                                icon={Download}
                                title="Ekspor ZIP & HTML"
                                body="Unduh file desain HTML lengkap yang siap dideploy atau diintegrasikan ke codebase Anda."
                            />
                        </div>
                    </section>

                    {/* Final CTA */}
                    <section className="mx-auto w-full max-w-6xl px-5 pb-20 md:px-8 md:pb-28">
                        <div className="border-border/70 bg-card/50 relative overflow-hidden rounded-3xl border px-6 py-14 text-center backdrop-blur-xl md:px-12 md:py-20">
                            <div className="bg-primary/25 pointer-events-none absolute -top-24 left-1/2 size-72 -translate-x-1/2 rounded-full blur-[100px]" />
                            <div className="relative">
                                <h2 className="text-3xl font-semibold tracking-tight md:text-4xl">
                                    Idemu layak jadi{' '}
                                    <span className="text-gradient">
                                        produk nyata
                                    </span>
                                </h2>
                                <p className="text-muted-foreground mx-auto mt-4 max-w-xl">
                                    Mulai wawancara sekarang. Dapatkan dokumen
                                    spesifikasi PRD dan mockup desain UI yang
                                    siap pakai.
                                </p>
                                <div className="mt-8 flex justify-center">
                                    <Button
                                        asChild
                                        size="lg"
                                        className="shadow-primary/25 group rounded-full px-8 shadow-xl"
                                    >
                                        <Link href={primaryHref}>
                                            {auth.user
                                                ? 'Buka workspace'
                                                : 'Masuk ke workspace'}
                                            <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
                                        </Link>
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </section>
                </main>

                <footer className="border-border/60 relative z-10 border-t">
                    <div className="text-muted-foreground mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-3 px-5 py-7 text-sm md:flex-row md:px-8">
                        <div className="flex items-center gap-2">
                            <div className="bg-primary text-primary-foreground flex size-7 items-center justify-center rounded-lg">
                                <Sparkles className="size-3.5" />
                            </div>
                            <span className="text-foreground font-medium">
                                PRD.ai
                            </span>
                        </div>
                        <p>Dari ide mentah ke PRD siap development.</p>
                    </div>
                </footer>
            </div>
        </>
    );
}

function Aurora() {
    return (
        <div
            aria-hidden
            className="pointer-events-none absolute inset-0 z-0 overflow-hidden"
        >
            <div className="animate-aurora bg-primary/20 absolute -left-32 -top-40 size-[36rem] rounded-full blur-[120px]" />
            <div
                className="animate-aurora absolute -top-20 right-0 size-[32rem] rounded-full bg-[oklch(0.7_0.18_280/0.18)] blur-[120px]"
                style={{ animationDelay: '-6s' }}
            />
            <div
                className="animate-aurora absolute left-1/3 top-[40%] size-[30rem] rounded-full bg-[oklch(0.72_0.16_200/0.15)] blur-[120px]"
                style={{ animationDelay: '-12s' }}
            />
        </div>
    );
}

function Marquee() {
    const items = [...MARQUEE_ITEMS, ...MARQUEE_ITEMS];

    return (
        <div className="group relative flex overflow-hidden [mask-image:linear-gradient(to_right,transparent,#000_12%,#000_88%,transparent)]">
            <div className="animate-marquee flex shrink-0 items-center gap-3 pr-3 group-hover:[animation-play-state:paused]">
                {items.map((item, index) => (
                    <span
                        key={`${item}-${index}`}
                        className="border-border/70 bg-background/60 text-muted-foreground flex items-center gap-2 whitespace-nowrap rounded-full border px-4 py-1.5 text-sm backdrop-blur-sm"
                    >
                        <Sparkles className="text-primary size-3.5" />
                        {item}
                    </span>
                ))}
            </div>
        </div>
    );
}

function BentoCard({
    icon: Icon,
    title,
    body,
    className,
    accent = false,
}: {
    icon: typeof Wand2;
    title: string;
    body: string;
    className?: string;
    accent?: boolean;
}) {
    return (
        <div
            className={cn(
                'border-border/70 bg-card/60 hover:border-primary/40 hover:shadow-primary/5 group relative flex flex-col justify-between overflow-hidden rounded-2xl border p-6 backdrop-blur-md transition hover:-translate-y-1 hover:shadow-xl',
                className,
            )}
        >
            {accent ? (
                <div className="bg-primary/15 group-hover:bg-primary/25 pointer-events-none absolute -right-16 -top-16 size-48 rounded-full blur-3xl transition" />
            ) : null}
            <div className="bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground relative flex size-11 items-center justify-center rounded-xl transition">
                <Icon className="size-5" />
            </div>
            <div className="relative mt-4">
                <h3 className="text-lg font-semibold">{title}</h3>
                <p className="text-muted-foreground mt-2 text-sm leading-6">
                    {body}
                </p>
            </div>
        </div>
    );
}

function HeroPreview() {
    return (
        <div className="animate-float mx-auto max-w-5xl">
            <div className="grid items-stretch gap-4 md:grid-cols-[1.2fr_auto_1.2fr_auto_1.5fr]">
                {/* Input: messy idea */}
                <div className="border-border/70 bg-card/60 shadow-primary/5 rounded-3xl border p-5 text-left shadow-xl backdrop-blur-xl">
                    <div className="text-muted-foreground flex items-center gap-2 text-xs font-medium uppercase tracking-[0.16em]">
                        <Lightbulb className="size-4 text-amber-400" />
                        Idemu (mentah)
                    </div>
                    <p className="text-foreground/90 mt-4 text-[14px] leading-6">
                        "Aku mau bikin app yang bantu founder nulis dokumen
                        produk dan langsung dapet mockup UI yang siap
                        didevelop..."
                    </p>
                    <div className="text-muted-foreground mt-5 flex items-center gap-2 text-xs">
                        <MessageCircle className="text-primary size-3.5" />
                        Lalu AI tanya 5 hal penting
                    </div>
                </div>

                {/* Transform arrow 1 */}
                <div className="relative flex items-center justify-center">
                    <div className="border-primary/30 bg-primary/10 text-primary shadow-primary/20 flex size-10 items-center justify-center rounded-full border shadow-lg">
                        <Wand2 className="size-4" />
                    </div>
                </div>

                {/* Output 1: structured PRD */}
                <div className="border-primary/30 bg-card/70 shadow-primary/10 rounded-3xl border p-5 text-left shadow-xl backdrop-blur-xl">
                    <div className="flex items-center justify-between">
                        <div className="text-primary flex items-center gap-2 text-xs font-medium uppercase tracking-[0.16em]">
                            <FileText className="size-4" />
                            PRD jadi
                        </div>
                        <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[11px] font-medium text-emerald-500">
                            Tersimpan
                        </span>
                    </div>
                    <h3 className="mt-4 text-base font-semibold">
                        AI PRD Document
                    </h3>
                    <div className="mt-3 space-y-1.5">
                        {PRD_SECTIONS.map((section) => (
                            <div
                                key={section}
                                className="text-muted-foreground flex items-center gap-2 text-sm"
                            >
                                <Check className="size-3.5 shrink-0 text-emerald-500" />
                                {section}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Transform arrow 2 */}
                <div className="relative flex items-center justify-center">
                    <div className="border-primary/30 bg-primary/10 text-primary shadow-primary/20 flex size-10 items-center justify-center rounded-full border shadow-lg">
                        <Sparkles className="size-4 animate-pulse" />
                    </div>
                </div>

                {/* Output 2: Interactive UI */}
                <div className="border-primary/30 bg-card/70 shadow-primary/10 flex flex-col justify-between rounded-3xl border p-5 text-left shadow-xl backdrop-blur-xl">
                    <div>
                        <div className="flex items-center justify-between">
                            <div className="text-primary flex items-center gap-2 text-xs font-medium uppercase tracking-[0.16em]">
                                <Layers className="size-4" />
                                Desain UI
                            </div>
                            <span className="bg-primary/15 text-primary rounded-full px-2 py-0.5 text-[11px] font-medium">
                                v1 (Live)
                            </span>
                        </div>
                        <h3 className="mt-4 text-base font-semibold">
                            Dashboard Admin
                        </h3>
                        <div className="mt-3 space-y-2">
                            <div className="bg-muted-foreground/15 h-2 w-full rounded" />
                            <div className="grid grid-cols-3 gap-2">
                                <div className="border-border/85 bg-background/60 flex h-7 items-center justify-center rounded border p-1">
                                    <LayoutDashboard className="text-muted-foreground size-3" />
                                </div>
                                <div className="border-border/85 bg-background/60 flex h-7 items-center justify-center rounded border p-1">
                                    <Smartphone className="text-muted-foreground size-3" />
                                </div>
                                <div className="border-border/85 bg-background/60 flex h-7 items-center justify-center rounded border p-1">
                                    <Check className="size-3 text-emerald-500" />
                                </div>
                            </div>
                            <div className="border-primary/20 bg-primary/5 text-muted-foreground rounded border p-2 text-[10px] leading-4">
                                <span className="text-primary block font-semibold">
                                    Tailwind v4 + React 19
                                </span>
                                Clean, responsive layout.
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
