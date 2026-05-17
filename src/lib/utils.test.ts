import { describe, it, expect } from 'vitest';
import { cn } from '@/lib/utils';

describe('cn', () => {
    it('merges class names', () => {
        expect(cn('px-4', 'py-2')).toBe('px-4 py-2');
    });

    it('handles falsy values', () => {
        expect(cn('base', null, undefined, false, 'visible')).toBe('base visible');
    });

    it('merges tailwind conflicts', () => {
        expect(cn('px-4', 'px-6')).toBe('px-6');
    });

    it('handles undefined values', () => {
        expect(cn('foo', undefined, 'bar')).toBe('foo bar');
    });
});
