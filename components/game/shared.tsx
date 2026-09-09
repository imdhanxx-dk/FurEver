'use client';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import type {
  Intent,
  PlayerState,
  GameConfig,
  GameResult,
} from '@/lib/game/types';
export type Action = (intent: Intent) => Promise<GameResult | undefined>;
export type ScreenProps = {
  state: PlayerState;
  config: GameConfig;
  act: Action;
  busy: boolean;
  navigate: (path: string) => void;
  notify: (message: string) => void;
  request: (path: string, data?: unknown) => Promise<Record<string, unknown>>;
  admin: boolean;
  ai: boolean;
  payments: boolean;
};
export function Choice({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
}) {
  return (
    <label className="field">
      <span>{label}</span>
      <Select value={value} onValueChange={(v) => v && onChange(String(v))}>
        <SelectTrigger className="choice-trigger" aria-label={label}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((v) => (
            <SelectItem key={v} value={v}>
              {v}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </label>
  );
}
export function Meter({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color?: string;
}) {
  return (
    <div
      className="meter"
      style={
        { '--meter-color': color || 'var(--primary)' } as React.CSSProperties
      }
    >
      <div>
        <span>{label}</span>
        <strong>
          {Math.round(value)}
          <small> / 100</small>
        </strong>
      </div>
      <Progress value={value} aria-label={label} />
    </div>
  );
}
export function SectionTitle({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  children?: React.ReactNode;
}) {
  return (
    <header className="section-title">
      <div>
        <div className="eyebrow">{eyebrow}</div>
        <h2>{title}</h2>
        {description && <p>{description}</p>}
      </div>
      {children}
    </header>
  );
}
