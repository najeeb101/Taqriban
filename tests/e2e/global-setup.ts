import { mkdirSync, writeFileSync } from 'node:fs';

export default function globalSetup() {
  mkdirSync('test-results', { recursive: true });
  writeFileSync('test-results/.e2e-start', new Date().toISOString());
}
