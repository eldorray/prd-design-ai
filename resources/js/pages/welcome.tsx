import { Head, Link, usePage } from '@inertiajs/react';
import { ArrowRight, Check } from 'lucide-react';
import type { ComponentType, ReactNode } from 'react';

import { Button } from '@/components/ui/button';
import WaitlistForm from '@/components/waitlist-form';
import { cn } from '@/lib/utils';
import { dashboard, home, login } from '@/routes';
import type { Auth } from '@/types';

type PageProps = {
    auth: Auth;
    poweredBy: string | null;
    [key: string]: unknown;
};

type RowState = 'done' | 'writing' | 'pending';

const NAV_LINKS = [
    { href: '#alur', label: 'Alur kerja' },
    { href: '#fitur', label: 'Fitur' },
    { href: '#contoh', label: 'Contoh hasil' },
];

const AUDIENCES = [
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
        title: 'Tulis ide',
        body: 'Mulai dari ide mentah. Cukup ceritakan produk apa yang ingin kamu buat.',
    },
    {
        title: 'Wawancara AI',
        body: 'AI menggali MVP secara interaktif dengan satu pertanyaan setiap kalinya.',
    },
    {
        title: 'Terbitkan PRD',
        body: 'Spesifikasi produk lengkap otomatis terstruktur dalam format Markdown.',
    },
    {
        title: 'Rancang Desain UI',
        body: 'Satu klik untuk generate layout dan mockup halaman web interaktif berbasis PRD.',
    },
];

const PRD_ROWS: { title: string; state: RowState }[] = [
    { title: 'Ringkasan', state: 'done' },
    { title: 'Masalah', state: 'done' },
    { title: 'Target User', state: 'done' },
    { title: 'Scope MVP', state: 'done' },
    { title: 'Fitur Utama', state: 'writing' },
    { title: 'User Flow', state: 'pending' },
];

const PAGE_KINDS: { label: string; Wireframe: ComponentType }[] = [
    { label: 'Landing page', Wireframe: LandingWireframe },
    { label: 'Dashboard', Wireframe: DashboardWireframe },
    { label: 'Mobile app mockup', Wireframe: MobileWireframe },
];

const FEATURES = [
    {
        code: 'F.03',
        title: 'Visual & Code Editor',
        body: 'Modifikasi teks, font, dan warna langsung pada elemen canvas, atau salin kode HTML mentahnya.',
    },
    {
        code: 'F.04',
        title: 'Riwayat & Switcher Versi',
        body: 'Kembali ke versi revisi sebelumnya secara visual, bandingkan perubahan, dan branch kapan pun diinginkan.',
    },
    {
        code: 'F.05',
        title: 'Ekspor ZIP & HTML',
        body: 'Unduh file desain HTML lengkap yang siap dideploy atau diintegrasikan ke codebase Anda.',
    },
];

// Every band shares one gutter so the 12-column grids line up.
const CONTAINER =
    'mx-auto w-full max-w-[1440px] px-5 sm:px-8 lg:px-12 xl:px-20';
const FOCUS_RING =
    'rounded-sm outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50';
const KICKER =
    'font-mono text-xs tracking-[0.1em] text-muted-foreground uppercase';
const INK_CTA =
    'group h-14 w-full gap-3 rounded-lg px-6 text-base has-[>svg]:px-6 sm:w-auto';
const TEXT_LINK = cn(
    FOCUS_RING,
    'inline-flex min-h-11 items-center text-base font-medium underline underline-offset-[6px] transition-colors hover:text-brand',
);
// Anchored sections land below the sticky header.
const ANCHOR_OFFSET = 'scroll-mt-16 lg:scroll-mt-20';

export default function Welcome() {
    const { auth, poweredBy } = usePage<PageProps>().props;

    return (
        <>
            <Head title="Home" />

            <div className="min-h-screen overflow-x-clip bg-background text-foreground">
                <header className="sticky top-0 z-30 border-b border-border bg-background">
                    <div
                        className={cn(
                            CONTAINER,
                            'flex h-16 items-center justify-between gap-6 md:grid md:grid-cols-[1fr_auto_1fr] lg:h-20',
                        )}
                    >
                        <Link
                            href={home()}
                            className={cn(
                                FOCUS_RING,
                                'justify-self-start py-2 font-serif text-[28px] leading-none lg:text-[32px]',
                            )}
                        >
                            PRD<span className="text-brand italic">.ai</span>
                        </Link>

                        <nav
                            aria-label="Navigasi"
                            className="hidden items-center gap-9 text-[15px] md:flex"
                        >
                            {NAV_LINKS.map((item) => (
                                <a
                                    key={item.href}
                                    href={item.href}
                                    className={cn(
                                        FOCUS_RING,
                                        'py-2 transition-colors hover:text-brand',
                                    )}
                                >
                                    {item.label}
                                </a>
                            ))}
                        </nav>

                        <div className="justify-self-end">
                            <Button
                                asChild
                                variant="outline"
                                className="h-11 rounded-lg border-foreground bg-transparent px-[18px] lg:h-10"
                            >
                                {auth.user ? (
                                    <Link href={dashboard()}>
                                        Buka workspace
                                    </Link>
                                ) : (
                                    <Link href={login()}>Masuk</Link>
                                )}
                            </Button>
                        </div>
                    </div>
                </header>

                <main>
                    {/* Hero */}
                    <section
                        className={cn(
                            CONTAINER,
                            'grid grid-cols-1 gap-y-16 pt-12 pb-20 sm:pt-16 lg:grid-cols-12 lg:items-center lg:gap-x-6 lg:pt-[88px] lg:pb-[104px]',
                        )}
                    >
                        <div className="flex flex-col gap-7 lg:col-span-6 lg:gap-8 xl:col-span-7">
                            <p
                                className={cn(
                                    KICKER,
                                    'flex items-center gap-2.5',
                                )}
                            >
                                <span
                                    aria-hidden
                                    className="size-2 shrink-0 bg-brand"
                                />
                                AI PRD & Design Studio · Bahasa Indonesia
                            </p>

                            <h1 className="font-serif text-[length:clamp(3rem,7.5vw,6.75rem)] leading-[0.94] font-normal tracking-[-0.02em] text-balance">
                                Jelaskan idemu,{' '}
                                <em className="text-brand">AI tulis PRD</em> &
                                buat desain UI-nya.
                            </h1>

                            <p className="max-w-[540px] text-lg leading-[1.55] text-pretty text-muted-foreground lg:text-xl">
                                Ubah ide produk mentah menjadi dokumen
                                spesifikasi (PRD) lengkap sekaligus mockup
                                antarmuka pengguna (UI design) interaktif dalam
                                hitungan menit. Siap ekspor untuk developer.
                            </p>

                            <div className="flex flex-col items-start gap-x-7 gap-y-3 sm:flex-row sm:flex-wrap sm:items-center">
                                {auth.user ? (
                                    <>
                                        <Button
                                            asChild
                                            size="lg"
                                            className={INK_CTA}
                                        >
                                            <Link href={dashboard()}>
                                                Buka workspace
                                                <CtaArrow />
                                            </Link>
                                        </Button>
                                        <a href="#contoh" className={TEXT_LINK}>
                                            Lihat contoh hasil
                                        </a>
                                    </>
                                ) : (
                                    <>
                                        {/* Registration is closed: visitors
                                        join the waitlist, and an admin
                                        creates their account by hand. */}
                                        <Button
                                            asChild
                                            size="lg"
                                            className={INK_CTA}
                                        >
                                            <a href="#akses">
                                                Minta akses
                                                <CtaArrow />
                                            </a>
                                        </Button>
                                        <Link
                                            href={login()}
                                            className={TEXT_LINK}
                                        >
                                            Sudah punya akun? Masuk
                                        </Link>
                                    </>
                                )}
                            </div>

                            <p className="font-mono text-xs text-muted-foreground">
                                Akses masih terbatas · Daftar tunggu gratis ·
                                Hasil dalam hitungan menit
                            </p>
                        </div>

                        <HeroCollage />
                    </section>

                    {/* Audience strip */}
                    <section
                        aria-labelledby="dibuat-untuk"
                        className="border-y border-border"
                    >
                        <div
                            className={cn(
                                CONTAINER,
                                'flex flex-col gap-3 py-[22px] sm:flex-row sm:items-center sm:gap-10',
                            )}
                        >
                            <p
                                id="dibuat-untuk"
                                className="shrink-0 label-mono"
                            >
                                Dibuat untuk
                            </p>
                            <ul className="flex flex-wrap gap-x-3.5 gap-y-1.5 text-base">
                                {AUDIENCES.map((audience, index) => (
                                    <li
                                        key={audience}
                                        className="flex items-center gap-3.5"
                                    >
                                        {audience}
                                        {index < AUDIENCES.length - 1 ? (
                                            <span
                                                aria-hidden
                                                className="text-muted-foreground/50"
                                            >
                                                /
                                            </span>
                                        ) : null}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </section>

                    {/* How it works */}
                    <section
                        id="alur"
                        aria-labelledby="alur-title"
                        className={cn(
                            CONTAINER,
                            ANCHOR_OFFSET,
                            'flex flex-col gap-12 py-20 lg:gap-16 lg:py-[120px]',
                        )}
                    >
                        <SectionHeader id="alur-title" kicker="Alur kerja">
                            Dari ide mentah ke desain nyata.
                        </SectionHeader>

                        <ol className="grid grid-cols-1 divide-y divide-border border-t border-foreground lg:grid-cols-4 lg:divide-x lg:divide-y-0">
                            {STEPS.map((step, index) => (
                                <li
                                    key={step.title}
                                    className="grid grid-cols-[4.5rem_minmax(0,1fr)] gap-x-4 gap-y-2 py-7 lg:flex lg:flex-col lg:gap-4 lg:px-7 lg:pt-7 lg:pb-2 lg:first:pl-0 lg:last:pr-0"
                                >
                                    <span className="row-span-2 font-serif text-[56px] leading-none text-brand italic lg:text-[80px]">
                                        {String(index + 1).padStart(2, '0')}
                                    </span>
                                    <h3 className="text-lg font-semibold lg:text-xl">
                                        {step.title}
                                    </h3>
                                    <p className="text-base leading-[1.55] text-muted-foreground">
                                        {step.body}
                                    </p>
                                </li>
                            ))}
                        </ol>
                    </section>

                    {/* Features: an always-dark band via a scoped `dark` class.
                    --band lifts it off the page when the whole app is dark. */}
                    <section
                        id="fitur"
                        aria-labelledby="fitur-title"
                        className={cn(
                            ANCHOR_OFFSET,
                            'dark bg-(--band) text-foreground [--band:var(--background)] dark:[--band:var(--card)]',
                        )}
                    >
                        <div
                            className={cn(
                                CONTAINER,
                                'flex flex-col gap-12 py-20 lg:gap-16 lg:py-[120px]',
                            )}
                        >
                            <SectionHeader
                                id="fitur-title"
                                kicker="Fitur & Kemampuan"
                            >
                                Hubungkan PRD & rancang{' '}
                                <em className="text-brand">desain UI</em>.
                            </SectionHeader>

                            <div className="grid grid-cols-1 gap-px border border-border bg-border md:grid-cols-2 lg:grid-cols-3">
                                <article className="flex flex-col gap-5 bg-(--band) px-6 py-8 sm:p-10 md:col-span-2">
                                    <FeatureCode>F.01</FeatureCode>
                                    <h3 className="font-serif text-4xl leading-none font-normal lg:text-[44px]">
                                        Ubah PRD Jadi Desain UI
                                    </h3>
                                    <p className="max-w-[600px] text-base leading-relaxed text-muted-foreground">
                                        Satu klik untuk merancang mockup halaman
                                        website atau aplikasi langsung dari
                                        spesifikasi PRD Anda. Pilih jenis
                                        halaman seperti Landing Page, Dashboard
                                        admin, atau Mobile App mockup.
                                    </p>
                                    <div className="mt-2 grid gap-3 sm:grid-cols-3 sm:gap-4">
                                        {PAGE_KINDS.map(
                                            ({ label, Wireframe }) => (
                                                <figure
                                                    key={label}
                                                    className="m-0 flex flex-col gap-3 border border-border p-4"
                                                >
                                                    <div
                                                        aria-hidden
                                                        className="h-24 sm:h-[120px]"
                                                    >
                                                        <Wireframe />
                                                    </div>
                                                    <figcaption className="text-sm font-medium">
                                                        {label}
                                                    </figcaption>
                                                </figure>
                                            ),
                                        )}
                                    </div>
                                </article>

                                <FeatureCell
                                    code="F.02"
                                    title="Fokus Scope MVP"
                                    body="Memisahkan scope dari non-scope dokumen spesifikasi agar pengerjaan tetap efisien."
                                >
                                    <div className="mt-auto pt-3">
                                        <div className="grid grid-cols-2 gap-px border border-border bg-border text-[13px]">
                                            <div className="flex flex-col gap-1.5 bg-(--band) p-3">
                                                <span className="font-mono text-[11px] text-muted-foreground uppercase">
                                                    Masuk scope
                                                </span>
                                                <span>Catat pembayaran</span>
                                                <span>Pengingat otomatis</span>
                                            </div>
                                            <div className="flex flex-col gap-1.5 bg-(--band) p-3 text-muted-foreground">
                                                <span className="font-mono text-[11px] uppercase">
                                                    Di luar scope
                                                </span>
                                                <s>Payment gateway</s>
                                                <s>Aplikasi mobile</s>
                                            </div>
                                        </div>
                                    </div>
                                </FeatureCell>

                                {FEATURES.map((feature) => (
                                    <FeatureCell
                                        key={feature.code}
                                        code={feature.code}
                                        title={feature.title}
                                        body={feature.body}
                                    />
                                ))}
                            </div>
                        </div>
                    </section>

                    {/* Final CTA */}
                    <section
                        id="akses"
                        aria-labelledby="akses-title"
                        className={cn(
                            CONTAINER,
                            ANCHOR_OFFSET,
                            'grid grid-cols-1 gap-y-10 py-20 lg:grid-cols-12 lg:items-end lg:gap-x-6 lg:py-32',
                        )}
                    >
                        <h2
                            id="akses-title"
                            className="font-serif text-[length:clamp(3rem,7.2vw,6.5rem)] leading-[0.94] font-normal tracking-[-0.02em] text-balance lg:col-span-7 xl:col-span-8"
                        >
                            Idemu layak jadi{' '}
                            <em className="text-brand">produk nyata.</em>
                        </h2>

                        <div className="flex flex-col items-start gap-6 lg:col-span-5 lg:pb-2 xl:col-span-4">
                            <p className="text-lg leading-[1.55] text-muted-foreground">
                                {auth.user
                                    ? 'Mulai wawancara sekarang. Dapatkan dokumen spesifikasi PRD dan mockup desain UI yang siap pakai.'
                                    : 'Akses sedang dibuka bertahap. Tinggalkan email, kami kabari saat akunmu siap.'}
                            </p>
                            {auth.user ? (
                                <Button asChild size="lg" className={INK_CTA}>
                                    <Link href={dashboard()}>
                                        Buka workspace
                                        <CtaArrow />
                                    </Link>
                                </Button>
                            ) : (
                                <WaitlistForm />
                            )}
                        </div>
                    </section>
                </main>

                <footer className="border-t border-border">
                    <div
                        className={cn(
                            CONTAINER,
                            'flex flex-col items-start gap-3 py-7 text-sm text-muted-foreground md:flex-row md:items-center md:justify-between',
                        )}
                    >
                        <span className="font-serif text-2xl leading-none text-foreground">
                            PRD<em className="text-brand">.ai</em>
                        </span>
                        <p>Dari ide mentah ke PRD siap development.</p>
                        <span className="font-mono text-xs">
                            © {new Date().getFullYear()} PRD.ai
                            {poweredBy ? ` · Powered by ${poweredBy}` : null}
                        </span>
                    </div>
                </footer>
            </div>
        </>
    );
}

function CtaArrow() {
    return (
        <ArrowRight
            aria-hidden
            strokeWidth={1.75}
            className="size-[18px] transition-transform group-hover:translate-x-0.5"
        />
    );
}

function SectionHeader({
    id,
    kicker,
    children,
}: {
    id: string;
    kicker: string;
    children: ReactNode;
}) {
    return (
        <div className="grid grid-cols-1 gap-y-4 lg:grid-cols-12 lg:items-end lg:gap-x-6">
            <p className={cn(KICKER, 'lg:col-span-3 lg:mb-3')}>{kicker}</p>
            <h2
                id={id}
                className="font-serif text-[length:clamp(2.5rem,5.3vw,4.75rem)] leading-none font-normal tracking-[-0.015em] text-balance lg:col-span-9"
            >
                {children}
            </h2>
        </div>
    );
}

function FeatureCode({ children }: { children: ReactNode }) {
    return (
        <span className="font-mono text-xs text-muted-foreground">
            {children}
        </span>
    );
}

function FeatureCell({
    code,
    title,
    body,
    children,
}: {
    code: string;
    title: string;
    body: string;
    children?: ReactNode;
}) {
    return (
        <article className="flex flex-col gap-3.5 bg-(--band) px-6 py-8 sm:px-9 sm:py-10">
            <FeatureCode>{code}</FeatureCode>
            <h3 className="text-[22px] leading-tight font-semibold">{title}</h3>
            <p className="text-[15px] leading-relaxed text-muted-foreground">
                {body}
            </p>
            {children}
        </article>
    );
}

function HeroCollage() {
    return (
        <section
            id="contoh"
            aria-label="Contoh hasil"
            className={cn(
                ANCHOR_OFFSET,
                'relative w-full max-w-xl lg:col-span-6 lg:h-[660px] lg:max-w-none xl:col-span-5',
            )}
        >
            {/* PRD sheet, with a second sheet peeking out beneath it. */}
            <div className="relative mr-3 lg:absolute lg:top-0 lg:right-0 lg:left-10 lg:mr-0 lg:h-[540px]">
                <div
                    aria-hidden
                    className="absolute inset-0 translate-x-3 translate-y-3 border border-border bg-secondary lg:translate-x-4 lg:translate-y-4"
                />
                <article className="relative flex h-full flex-col gap-5 border border-border bg-card p-6 shadow-[0_30px_60px_-30px_rgb(25_24_21/0.35)] sm:p-8">
                    <div className="flex items-center justify-between gap-4 label-mono">
                        <span>PRD · versi 1</span>
                        <span className="flex items-center gap-1.5">
                            <Check
                                aria-hidden
                                strokeWidth={2}
                                className="size-3.5"
                            />
                            Tersimpan
                        </span>
                    </div>
                    <p className="font-serif text-[32px] leading-[1.05] sm:text-4xl">
                        Aplikasi Pencatat SPP Yayasan
                    </p>
                    <ol className="flex flex-col border-t border-foreground text-[15px]">
                        {PRD_ROWS.map((row, index) => (
                            <PrdRow
                                key={row.title}
                                number={String(index + 1).padStart(2, '0')}
                                title={row.title}
                                state={row.state}
                            />
                        ))}
                    </ol>
                </article>
            </div>

            <div className="mt-8 grid gap-4 sm:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)] sm:items-start lg:mt-0 lg:block">
                <figure className="m-0 flex flex-col gap-3 rounded-md bg-foreground px-[22px] py-5 text-background min-[1440px]:w-[300px] lg:absolute lg:top-[452px] lg:left-0 lg:w-[260px]">
                    <figcaption className="font-mono text-[11px] tracking-[0.08em] text-background/70 uppercase">
                        Idemu (mentah)
                    </figcaption>
                    <blockquote className="font-serif text-[21px] leading-[1.25] italic">
                        “Mau bikin app buat catat SPP siswa MI & SMP, sekalian
                        ngingetin wali murid yang telat bayar…”
                    </blockquote>
                    <span className="font-mono text-xs text-background/70">
                        <span aria-hidden>→ </span>Lalu AI tanya 5 hal penting
                    </span>
                </figure>

                <div className="flex flex-col gap-2.5 border border-border bg-card p-3.5 shadow-[0_20px_40px_-24px_rgb(25_24_21/0.4)] min-[1440px]:w-[232px] lg:absolute lg:top-[470px] lg:-right-6 lg:w-[200px]">
                    <div className="flex items-center justify-between gap-3 font-mono text-[11px] tracking-[0.06em] text-muted-foreground uppercase">
                        <span>Desain UI</span>
                        <span className="flex items-center gap-1.5 text-brand">
                            <span
                                aria-hidden
                                className="size-1.5 rounded-full bg-brand"
                            />
                            v1 (Live)
                        </span>
                    </div>
                    <div
                        aria-hidden
                        className="grid h-[92px] grid-cols-[44px_minmax(0,1fr)] gap-1.5 bg-secondary p-1.5"
                    >
                        <div className="bg-foreground" />
                        <div className="grid grid-rows-[18px_1fr] gap-1.5">
                            <div className="grid grid-cols-3 gap-1.5">
                                <div className="bg-card" />
                                <div className="bg-card" />
                                <div className="bg-card" />
                            </div>
                            <div className="bg-card" />
                        </div>
                    </div>
                    <span className="text-sm font-medium">Dashboard Admin</span>
                </div>
            </div>
        </section>
    );
}

function PrdRow({
    number,
    title,
    state,
}: {
    number: string;
    title: string;
    state: RowState;
}) {
    const writing = state === 'writing';

    return (
        <li
            className={cn(
                'grid grid-cols-[2.5rem_minmax(0,1fr)_auto] items-center border-b border-border py-[11px]',
                state === 'pending' && 'text-muted-foreground',
            )}
        >
            <span
                className={cn(
                    'font-mono text-xs',
                    writing ? 'text-brand' : 'text-muted-foreground',
                )}
            >
                {number}
            </span>
            {writing ? (
                <span className="flex items-center gap-1 font-medium">
                    {title}
                    <span aria-hidden className="h-[18px] w-0.5 bg-brand" />
                </span>
            ) : (
                <span>{title}</span>
            )}
            {state === 'done' ? (
                <span className="flex">
                    <Check aria-hidden strokeWidth={2} className="size-4" />
                    <span className="sr-only">Selesai</span>
                </span>
            ) : null}
            {writing ? (
                <span className="font-mono text-xs text-brand">menulis…</span>
            ) : null}
        </li>
    );
}

function LandingWireframe() {
    return (
        <div className="flex h-full flex-col gap-2">
            <div className="h-2.5 w-2/5 bg-input" />
            <div className="h-11 bg-secondary" />
            <div className="grid grow grid-cols-3 gap-2">
                <div className="bg-secondary" />
                <div className="bg-secondary" />
                <div className="bg-secondary" />
            </div>
        </div>
    );
}

function DashboardWireframe() {
    return (
        <div className="grid h-full grid-cols-[36px_minmax(0,1fr)] gap-2">
            <div className="bg-secondary" />
            <div className="grid grid-rows-[28px_1fr] gap-2">
                <div className="grid grid-cols-3 gap-2">
                    <div className="bg-secondary" />
                    <div className="bg-secondary" />
                    <div className="bg-brand" />
                </div>
                <div className="bg-secondary" />
            </div>
        </div>
    );
}

function MobileWireframe() {
    return (
        <div className="flex h-full justify-center">
            <div className="flex w-16 flex-col gap-1.5 rounded-[10px] border border-border px-1.5 py-2">
                <div className="h-7 rounded-[3px] bg-secondary" />
                <div className="h-2 bg-secondary" />
                <div className="h-2 w-[70%] bg-secondary" />
                <div className="grow" />
                <div className="h-3.5 rounded-[3px] bg-brand" />
            </div>
        </div>
    );
}
