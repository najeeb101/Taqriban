// Safe arithmetic evaluator (recursive descent; never eval). Returns null on any error.
// Supports + - * / × ÷ − ( ), decimals ('.' or '٫'), unary +/-, Arabic-Indic and Persian digits.
type Tok = { t: 'num'; v: number } | { t: 'op'; v: string };

function tokenize(src: string): Tok[] | null {
  const s = src
    .replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)))
    .replace(/[۰-۹]/g, (d) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)))
    .replace(/٫/g, '.')
    .replace(/[−–—]/g, '-')
    .replace(/[×xX✕]/g, '*')
    .replace(/÷/g, '/')
    .replace(/\s+/g, '');
  const out: Tok[] = [];
  let i = 0;
  while (i < s.length) {
    const c = s[i];
    if (/[0-9.]/.test(c)) {
      let j = i;
      while (j < s.length && /[0-9.]/.test(s[j])) j++;
      const lit = s.slice(i, j);
      if (!/^(\d+(\.\d*)?|\.\d+)$/.test(lit)) return null;
      out.push({ t: 'num', v: parseFloat(lit) });
      i = j;
    } else if ('+-*/()'.includes(c)) {
      out.push({ t: 'op', v: c });
      i++;
    } else {
      return null;
    }
  }
  return out;
}

export function evaluate(expr: string): number | null {
  const toks = tokenize(expr);
  if (!toks || toks.length === 0) return null;
  let pos = 0;
  const isOp = (v: string) => {
    const k = toks[pos];
    return k !== undefined && k.t === 'op' && k.v === v;
  };

  function parseExpr(): number {
    let left = parseTerm();
    while (isOp('+') || isOp('-')) {
      const op = (toks![pos++] as { v: string }).v;
      const right = parseTerm();
      left = op === '+' ? left + right : left - right;
    }
    return left;
  }
  function parseTerm(): number {
    let left = parseUnary();
    while (isOp('*') || isOp('/')) {
      const op = (toks![pos++] as { v: string }).v;
      const right = parseUnary();
      if (op === '/' && right === 0) throw new Error('div0');
      left = op === '*' ? left * right : left / right;
    }
    return left;
  }
  function parseUnary(): number {
    if (isOp('-')) {
      pos++;
      return -parseUnary();
    }
    if (isOp('+')) {
      pos++;
      return parseUnary();
    }
    return parsePrimary();
  }
  function parsePrimary(): number {
    const k = toks![pos];
    if (!k) throw new Error('eof');
    if (k.t === 'num') {
      pos++;
      return k.v;
    }
    if (k.v === '(') {
      pos++;
      const v = parseExpr();
      if (!isOp(')')) throw new Error('paren');
      pos++;
      return v;
    }
    throw new Error('unexpected');
  }

  try {
    const v = parseExpr();
    if (pos !== toks.length || !Number.isFinite(v)) return null;
    return v;
  } catch {
    return null;
  }
}
