// fmtNode — like fmt() but placeholders may be React nodes (e.g. <Num>…</Num>), so numbers stay isolated inside Arabic text.
import { Fragment, type ReactNode } from 'react';

export function fmtNode(template: string, vars: Record<string, ReactNode>): ReactNode {
  const parts = template.split(/(\{\w+\})/g);
  return parts.map((part, i) => {
    const m = part.match(/^\{(\w+)\}$/);
    if (m && m[1] in vars) return <Fragment key={i}>{vars[m[1]]}</Fragment>;
    return <Fragment key={i}>{part}</Fragment>;
  });
}
