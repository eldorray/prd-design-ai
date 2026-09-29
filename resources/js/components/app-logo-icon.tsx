import type { SVGAttributes } from 'react';

// "P." monogram: serif P in currentColor, brand-colored full stop.
export default function AppLogoIcon(props: SVGAttributes<SVGElement>) {
    return (
        <svg {...props} viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
            <text
                x="7"
                y="32"
                fontFamily="'Instrument Serif', Georgia, serif"
                fontSize="36"
            >
                P
            </text>
            <circle cx="31" cy="29" r="3.5" fill="var(--brand)" />
        </svg>
    );
}
