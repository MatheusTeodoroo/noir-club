import { describe, expect, it } from 'vitest';
import { CATEGORIES } from '../src/questions/index.ts';

describe('question bank', () => {
  it('has distinct categories with names in both languages', () => {
    const names = CATEGORIES.map((c) => c.name['pt-BR']);
    expect(new Set(names).size).toBe(names.length);
    for (const c of CATEGORIES) expect(c.name.en.trim()).not.toBe('');
  });

  for (const c of CATEGORIES) {
    it(`${c.name['pt-BR']}: every question is complete and has an integer answer`, () => {
      expect(c.questions.length).toBeGreaterThan(0);
      const texts = new Set<string>();
      for (const q of c.questions) {
        expect(q.text['pt-BR'].trim(), q.text['pt-BR']).not.toBe('');
        expect(q.text.en.trim(), q.text['pt-BR']).not.toBe('');
        expect(q.unit['pt-BR'].trim(), q.text['pt-BR']).not.toBe('');
        expect(q.unit.en.trim(), q.text['pt-BR']).not.toBe('');
        expect(Number.isSafeInteger(q.answer) && q.answer >= 0, q.text['pt-BR']).toBe(true);
        expect(texts.has(q.text['pt-BR']), q.text['pt-BR']).toBe(false);
        texts.add(q.text['pt-BR']);
      }
    });
  }
});
