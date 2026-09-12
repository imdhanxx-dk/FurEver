import type { SVGProps } from 'react';

type IconProps = SVGProps<SVGSVGElement> & { title?: string };

function BaseIcon({ title, children, ...props }: IconProps & { children: React.ReactNode }) {
  return (
    <svg viewBox="0 0 64 64" fill="none" aria-hidden={title ? undefined : true} role={title ? 'img' : undefined} {...props}>
      {title ? <title>{title}</title> : null}
      {children}
    </svg>
  );
}

const line = {
  stroke: 'currentColor',
  strokeWidth: 2.7,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
};

export function InventoryIcon(props: IconProps) {
  return <BaseIcon {...props}><path {...line} d="M20 23v-3c0-7 5-12 12-12s12 5 12 12v3"/><path {...line} d="M15 25c0-4 3-7 7-7h20c4 0 7 3 7 7v25c0 4-3 7-7 7H22c-4 0-7-3-7-7V25Z"/><path {...line} d="M23 32h18M23 42h18M25 18v8M39 18v8"/><path className="fe-icon-accent" d="M29.5 49c0-2 1-3.6 2.5-3.6s2.5 1.6 2.5 3.6c0 1.9-1.1 3-2.5 3s-2.5-1.1-2.5-3Zm-4.8-3.4c0-1.3.8-2.4 1.9-2.4s1.9 1.1 1.9 2.4-.8 2.2-1.9 2.2-1.9-.9-1.9-2.2Zm10.8 0c0-1.3.8-2.4 1.9-2.4s1.9 1.1 1.9 2.4-.8 2.2-1.9 2.2-1.9-.9-1.9-2.2Z"/></BaseIcon>;
}

export function TeamIcon(props: IconProps) {
  return <BaseIcon {...props}><path {...line} d="M12 51c0-9 5-16 13-16s13 7 13 16v4H12v-4Z"/><path {...line} d="m16 34 2-12 7 6 7-6 2 12"/><path {...line} d="M35 54v-2c0-7 4-13 11-13s11 6 11 13v2H35Z"/><path {...line} d="m39 38 2-9 5 4 5-4 2 9"/><circle className="fe-icon-accent" cx="22" cy="37" r="1.8"/><circle className="fe-icon-accent" cx="29" cy="37" r="1.8"/></BaseIcon>;
}

export function EventIcon(props: IconProps) {
  return <BaseIcon {...props}><rect {...line} x="11" y="15" width="42" height="39" rx="9"/><path {...line} d="M11 27h42M21 9v12M43 9v12"/><path className="fe-icon-accent" d="m32 32 3.2 6.5 7.2 1-5.2 5.1 1.2 7.1-6.4-3.4-6.4 3.4 1.2-7.1-5.2-5.1 7.2-1L32 32Z"/></BaseIcon>;
}

export function WorldMapIcon(props: IconProps) {
  return <BaseIcon {...props}><path {...line} d="m9 16 15-6 16 6 15-6v39l-15 6-16-6-15 6V16Z"/><path {...line} d="M24 10v39M40 16v39"/><path className="fe-icon-accent-stroke" d="M30 27c0-5.6 4-10 9-10s9 4.4 9 10c0 7-9 15-9 15s-9-8-9-15Z"/><circle className="fe-icon-accent" cx="39" cy="27" r="2.7"/></BaseIcon>;
}

export function FeedIcon(props: IconProps) {
  return <BaseIcon {...props}><path {...line} d="M12 37h40l-4 15H16l-4-15Z"/><path {...line} d="M19 37c2-8 7-13 13-13s11 5 13 13"/><circle className="fe-icon-accent" cx="24" cy="29" r="2.5"/><circle className="fe-icon-accent" cx="32" cy="26" r="2.5"/><circle className="fe-icon-accent" cx="40" cy="29" r="2.5"/><path className="fe-icon-detail" d="M21 54c7 3 15 3 22 0"/></BaseIcon>;
}

export function PlayIcon(props: IconProps) {
  return <BaseIcon {...props}><circle {...line} cx="29" cy="31" r="17"/><path {...line} d="M16 25c9 0 18 4 25 12M14 34c10-5 20-5 30 0M22 46c0-9 4-19 13-28"/><path className="fe-icon-accent-stroke" d="M42 42c8 0 12 3 12 8 0 3-2 5-5 5"/><path className="fe-icon-accent-stroke" d="m49 55 3-2 2 3"/></BaseIcon>;
}

export function PetIcon(props: IconProps) {
  return <BaseIcon {...props}><path className="fe-icon-heart" d="M32 53S10 41 10 24c0-8 5-14 13-14 5 0 8 2 9 7 2-5 5-7 10-7 7 0 12 6 12 14 0 17-22 29-22 29Z"/><path className="fe-icon-accent" d="m50 42 2.3 5 5.4.7-4 3.8 1 5.3-4.7-2.6-4.8 2.6 1-5.3-3.9-3.8 5.4-.7 2.3-5Z"/></BaseIcon>;
}

export function TrainIcon(props: IconProps) {
  return <BaseIcon {...props}><path {...line} d="M19 24v16M45 24v16M14 27v10M50 27v10M9 29v6M55 29v6M19 32h26"/><circle className="fe-icon-accent" cx="19" cy="32" r="3.4"/><circle className="fe-icon-accent" cx="45" cy="32" r="3.4"/><path className="fe-icon-detail" d="M25 47c4 2 10 2 14 0"/></BaseIcon>;
}

export function ExploreIcon(props: IconProps) {
  return <BaseIcon {...props}><path {...line} d="m32 7 7 18 18 7-18 7-7 18-7-18-18-7 18-7 7-18Z"/><circle className="fe-icon-accent" cx="32" cy="32" r="5"/><path className="fe-icon-accent-stroke" d="m49 9 2 5 5 2-5 2-2 5-2-5-5-2 5-2 2-5Z"/><path className="fe-icon-detail" d="M13 49c4 1 7 3 9 7"/></BaseIcon>;
}

export function PawCoinIcon(props: IconProps) {
  return <BaseIcon {...props}><circle className="fe-coin-ring" cx="32" cy="32" r="26"/><ellipse className="fe-coin-paw" cx="32" cy="40" rx="10" ry="8"/><circle className="fe-coin-paw" cx="20" cy="28" r="4.4"/><circle className="fe-coin-paw" cx="29" cy="22" r="4.4"/><circle className="fe-coin-paw" cx="39" cy="22" r="4.4"/><circle className="fe-coin-paw" cx="47" cy="29" r="4.4"/></BaseIcon>;
}

export function PlusIcon(props: IconProps) {
  return <BaseIcon {...props}><circle {...line} cx="32" cy="32" r="23"/><path {...line} strokeWidth="4" d="M32 20v24M20 32h24"/></BaseIcon>;
}

export function LocationIcon(props: IconProps) {
  return <BaseIcon {...props}><path {...line} d="M32 56S15 41 15 25c0-10 7-17 17-17s17 7 17 17c0 16-17 31-17 31Z"/><circle className="fe-icon-accent" cx="32" cy="25" r="6"/></BaseIcon>;
}

export function QuestPawIcon(props: IconProps) {
  return <BaseIcon {...props}><ellipse className="fe-icon-accent" cx="32" cy="42" rx="10" ry="8"/><circle className="fe-icon-accent" cx="20" cy="30" r="4"/><circle className="fe-icon-accent" cx="29" cy="24" r="4"/><circle className="fe-icon-accent" cx="39" cy="24" r="4"/><circle className="fe-icon-accent" cx="47" cy="31" r="4"/><path className="fe-icon-detail" d="m11 50 3 1 1 3 1-3 3-1-3-1-1-3-1 3-3 1Z"/></BaseIcon>;
}
