export default function Heading({
    title,
    description,
    variant = 'default',
}: {
    title: string;
    description?: string;
    variant?: 'default' | 'small';
}) {
    return (
        <header
            className={variant === 'small' ? 'space-y-1' : 'mb-8 space-y-2'}
        >
            <h2
                className={
                    variant === 'small'
                        ? 'font-serif text-[28px] leading-tight font-normal tracking-[-0.01em]'
                        : 'font-serif text-4xl leading-none font-normal tracking-[-0.015em] md:text-5xl'
                }
            >
                {title}
            </h2>
            {description && (
                <p
                    className={
                        variant === 'small'
                            ? 'text-sm text-muted-foreground'
                            : 'text-[15px] text-muted-foreground'
                    }
                >
                    {description}
                </p>
            )}
        </header>
    );
}
