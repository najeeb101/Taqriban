'use client';
// Markdown — renders napkin-math explanations with react-markdown (raw HTML is NOT rendered).
// Props: children (markdown string), className?. Digits follow the player's digit style; links open in a new tab.
import { Children, type ReactNode } from 'react';
import ReactMarkdown, { type Components } from 'react-markdown';
import { localizeDigits } from '@/lib/format';
import { usePrefs } from '@/components/providers/PrefsProvider';
import { cn } from './cn';

/** Localizes digits in string children according to the digit-style preference. */
function L({ children }: { children?: ReactNode }) {
  const { digitStyle } = usePrefs();
  if (digitStyle === 'latn') return <>{children}</>;
  return <>{Children.map(children, (c) => (typeof c === 'string' ? localizeDigits(c, digitStyle) : c))}</>;
}

const components: Components = {
  p: ({ children }) => (
    <p>
      <L>{children}</L>
    </p>
  ),
  li: ({ children }) => (
    <li>
      <L>{children}</L>
    </li>
  ),
  strong: ({ children }) => (
    <strong>
      <L>{children}</L>
    </strong>
  ),
  em: ({ children }) => (
    <em>
      <L>{children}</L>
    </em>
  ),
  h1: ({ children }) => (
    <h3 className="text-lg">
      <L>{children}</L>
    </h3>
  ),
  h2: ({ children }) => (
    <h3 className="text-lg">
      <L>{children}</L>
    </h3>
  ),
  h3: ({ children }) => (
    <h4 className="text-base">
      <L>{children}</L>
    </h4>
  ),
  h4: ({ children }) => (
    <h4 className="text-base">
      <L>{children}</L>
    </h4>
  ),
  blockquote: ({ children }) => <blockquote>{children}</blockquote>,
  a: ({ href, children }) => (
    <a href={href} target="_blank" rel="noopener noreferrer">
      <L>{children}</L>
    </a>
  ),
};

export function Markdown({ children, className }: { children: string; className?: string }) {
  return (
    <div
      className={cn(
        'space-y-3 [&_blockquote]:border-s-4 [&_blockquote]:border-line [&_blockquote]:ps-4 [&_blockquote]:text-muted [&_li]:my-1 [&_ol]:list-decimal [&_ol]:ps-6 [&_ul]:list-disc [&_ul]:ps-6',
        className,
      )}
    >
      <ReactMarkdown components={components}>{children}</ReactMarkdown>
    </div>
  );
}
