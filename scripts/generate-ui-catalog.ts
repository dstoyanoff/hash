/**
 * Generates `.claude/skills/ui-catalog/CATALOG.md`: every exported component and hook in
 * `@hash/ui`, with its doc comment and prop/parameter shape, read straight from the source so it
 * cannot drift. Run via `pnpm generate:catalog`. CI fails if the output would change.
 *
 * Parses source text directly (no TS compiler API — this repo's TypeScript is the tsgo preview,
 * which does not expose one) relying on this codebase's consistent style: one prop per line, a
 * single-line `/** ... *\/` doc comment directly above the thing it documents.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const UI_SRC = join(import.meta.dirname, '..', 'packages', 'ui', 'src');
const OUT_FILE = join(import.meta.dirname, '..', '.claude', 'skills', 'ui-catalog', 'CATALOG.md');

interface PropInfo {
  name: string;
  type: string;
  optional: boolean;
  doc: string;
}

interface InterfaceInfo {
  name: string;
  props: PropInfo[];
}

interface FunctionInfo {
  name: string;
  doc: string;
  signature: string;
}

interface FileCatalog {
  interfaces: InterfaceInfo[];
  functions: FunctionInfo[];
}

interface Section {
  heading: string;
  files: string[];
}

const sections: Section[] = [
  {
    heading: 'Layout',
    files: [
      'layout/dashboard.tsx',
      'layout/screen.tsx',
      'layout/grid.tsx',
      'layout/section.tsx',
      'layout/tile.tsx',
    ],
  },
  {
    heading: 'Entity components',
    files: [
      'entities/light-tile.tsx',
      'entities/climate-tile.tsx',
      'entities/sensor-readout.tsx',
      'entities/action-button.tsx',
      'entities/scene-button.tsx',
      'entities/media-player-bar.tsx',
      'entities/nav-tabs.tsx',
    ],
  },
  {
    heading: 'Hooks and provider',
    files: ['provider.tsx', 'hooks.ts', 'use-player.ts'],
  },
];

/** Finds the index just after the `{` matching the one at `openIndex`. */
function matchBrace(text: string, openIndex: number): number {
  let depth = 1;
  for (let i = openIndex + 1; i < text.length; i++) {
    if (text[i] === '{') depth++;
    else if (text[i] === '}') {
      depth--;
      if (depth === 0) return i;
    }
  }
  throw new Error(`Unmatched '{' at index ${openIndex}`);
}

/** The single-line `/** ... *\/` doc comment on its own line directly above `beforeIndex`, if any. */
function docCommentBefore(text: string, beforeIndex: number): string {
  const before = text.slice(0, beforeIndex);
  const match = /\/\*\*\s?(.*?)\s?\*\/\s*\n\s*$/.exec(before);
  return match?.[1] ?? '';
}

/** Splits an interface body into member texts on top-level `;` (ignoring `;` nested in `{}`/`<>`/`()`/`[]`,
 * e.g. an inline `{ width: number; height: number }` prop type). Each slice keeps any doc comment
 * directly above its member. */
function splitMembers(body: string): string[] {
  const members: string[] = [];
  let depth = 0;
  let inComment = false;
  let start = 0;
  for (let i = 0; i < body.length; i++) {
    if (inComment) {
      if (body.startsWith('*/', i)) inComment = false;
      continue;
    }
    if (body.startsWith('/*', i)) {
      inComment = true;
      continue;
    }
    const ch = body[i];
    if (ch === '{' || ch === '(' || ch === '<' || ch === '[') depth++;
    else if (ch === '}' || ch === ')' || ch === '>' || ch === ']') depth--;
    else if (ch === ';' && depth === 0) {
      members.push(body.slice(start, i));
      start = i + 1;
    }
  }
  return members;
}

function parseInterfaces(text: string): InterfaceInfo[] {
  const interfaces: InterfaceInfo[] = [];
  const re = /export interface (\w+) \{/g;
  const memberRe = /^(?:\/\*\*\s?(.*?)\s?\*\/\s*)?(\w+)(\??):\s*([\s\S]+)$/;

  for (const match of text.matchAll(re)) {
    const openIndex = match.index + match[0].length - 1;
    const closeIndex = matchBrace(text, openIndex);
    const body = text.slice(openIndex + 1, closeIndex);

    const props: PropInfo[] = [];
    for (const member of splitMembers(body)) {
      const propMatch = memberRe.exec(member.trim());
      if (!propMatch) continue;
      props.push({
        doc: propMatch[1] ?? '',
        name: propMatch[2]!,
        optional: propMatch[3] === '?',
        type: propMatch[4]!.trim(),
      });
    }
    interfaces.push({ name: match[1]!, props });
  }
  return interfaces;
}

function parseFunctions(text: string): FunctionInfo[] {
  const functions: FunctionInfo[] = [];
  const re = /export function (\w+)\(/g;
  for (const match of text.matchAll(re)) {
    const parenOpen = match.index + match[0].length - 1;
    let depth = 1;
    let i = parenOpen + 1;
    for (; i < text.length; i++) {
      if (text[i] === '(') depth++;
      else if (text[i] === ')') {
        depth--;
        if (depth === 0) break;
      }
    }
    const params = text
      .slice(parenOpen + 1, i)
      .replace(/\s+/g, ' ')
      .trim();
    const braceOpen = text.indexOf('{', i);
    const returnType = text
      .slice(i + 1, braceOpen)
      .replace(/^\s*:\s*/, '')
      .replace(/\s+/g, ' ')
      .trim();
    functions.push({
      name: match[1]!,
      doc: docCommentBefore(text, match.index),
      signature: `(${params})${returnType ? `: ${returnType}` : ''}`,
    });
  }
  return functions;
}

function parseFile(relativePath: string): FileCatalog {
  const text = readFileSync(join(UI_SRC, relativePath), 'utf8');
  return { interfaces: parseInterfaces(text), functions: parseFunctions(text) };
}

function renderFile(catalog: FileCatalog): string {
  const parts: string[] = [];
  for (const fn of catalog.functions) {
    const props = catalog.interfaces.find((i) => i.name === `${fn.name}Props`);
    parts.push(`### \`${fn.name}\``);
    if (fn.doc) parts.push(fn.doc);
    if (props && props.props.length > 0) {
      parts.push('| Prop | Type | Required | |', '|---|---|---|---|');
      for (const prop of props.props) {
        parts.push(
          `| \`${prop.name}\` | \`${prop.type}\` | ${prop.optional ? 'no' : 'yes'} | ${prop.doc} |`,
        );
      }
    } else {
      parts.push(`\`\`\`ts\nfunction ${fn.name}${fn.signature}\n\`\`\``);
    }
    parts.push('');
  }
  return parts.join('\n');
}

const lines: string[] = [
  '# @hash/ui component catalog',
  '',
  '_Generated by `pnpm generate:catalog` from `packages/ui/src`. Do not edit by hand — edit the ' +
    "source doc comments and prop types, then regenerate. CI fails if this file doesn't match._",
  '',
  "Import everything from `@hash/ui` (e.g. `import { LightTile, Section, mdiSofa } from '@hash/ui';`). " +
    'Icons: any `mdiXxx` name from `@mdi/js` is re-exported — browse names at ' +
    'https://pictogrammers.com/library/mdi/.',
  '',
];

for (const section of sections) {
  lines.push(`## ${section.heading}`, '');
  for (const file of section.files) lines.push(renderFile(parseFile(file)));
}

writeFileSync(
  OUT_FILE,
  lines
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trimEnd() + '\n',
);
console.log(`Wrote ${OUT_FILE}`);
