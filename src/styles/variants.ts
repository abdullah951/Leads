/**
 * CVA component variants — all colours reference CSS variables from global.css @theme.
 *
 * Primary brand is Indigo-600 (#4F46E5).
 * Ghost buttons use subtle borders for "Reveal" / secondary actions.
 * Badge "brand" intent uses indigo pill styling for credits counter.
 * Badge "success" uses soft emerald for revealed contact status.
 */

import { cva } from 'class-variance-authority';

// ── Button variants ────────────────────────────────────────────────────────────
export const buttonVariants = cva(
  // Base: flex, Inter font-medium, smooth colour transition, accessible focus ring
  'inline-flex items-center justify-center font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus-ring)] disabled:pointer-events-none disabled:opacity-50 cursor-pointer',
  {
    variants: {
      intent: {
        // Solid indigo — primary CTA (export, reveal all, etc.)
        primary: 'bg-[var(--color-brand)] text-white hover:bg-[var(--color-brand-dark)]',
        // White with hairline border — secondary actions
        secondary: 'bg-[var(--color-surface)] text-[var(--color-text-primary)] border border-[var(--color-border)] hover:bg-[var(--color-surface-subtle)]',
        // Red — destructive actions (delete, remove)
        danger: 'bg-[var(--color-error)] text-white hover:bg-red-600',
        // No fill — ghost for "Reveal" buttons in the table contact column
        ghost: 'text-[var(--color-text-primary)] hover:bg-[var(--color-surface-subtle)] border border-transparent hover:border-[var(--color-border)]',
        // Indigo ghost — active/selected state ghost buttons
        'ghost-brand': 'text-[var(--color-brand)] hover:bg-[var(--color-brand-light)] border border-transparent hover:border-[var(--color-brand-light)]',
      },
      size: {
        // Compact — table inline buttons, filter chip close icons
        sm: 'h-7 px-3 text-xs rounded-[var(--radius-md)]',
        // Default — toolbar buttons, form actions
        md: 'h-9 px-4 text-sm rounded-[var(--radius-md)]',
        // Large — primary page CTAs
        lg: 'h-10 px-5 text-sm rounded-[var(--radius-lg)]',
      },
    },
    defaultVariants: { intent: 'primary', size: 'md' },
  },
);

// ── Input variants ─────────────────────────────────────────────────────────────
export const inputVariants = cva(
  // Hairline Slate-200 border, indigo focus ring
  'w-full border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--color-focus-ring)] transition-colors',
  {
    variants: {
      size: {
        sm: 'h-7 px-2 text-xs rounded-[var(--radius-md)]',
        md: 'h-9 px-3 text-sm rounded-[var(--radius-md)]',
      },
    },
    defaultVariants: { size: 'md' },
  },
);

// ── Badge variants ─────────────────────────────────────────────────────────────
export const badgeVariants = cva(
  'inline-flex items-center gap-1 font-medium rounded-[var(--radius-full)]',
  {
    variants: {
      intent: {
        // Neutral — default label pills
        default: 'bg-[var(--color-surface-subtle)] text-[var(--color-text-secondary)]',
        // Indigo pill — credits counter in the top bar
        brand: 'bg-[var(--color-brand-light)] text-[var(--color-brand)]',
        // Amber — filter active states
        amber: 'bg-[var(--color-amber-light)] text-[var(--color-amber)]',
        // Soft emerald — "revealed" contact data status
        success: 'bg-[var(--color-emerald-light)] text-[var(--color-emerald)]',
        // Red — error states
        error: 'bg-red-100 text-red-600',
      },
      size: {
        sm: 'px-2 py-0.5 text-xs',
        md: 'px-2.5 py-1 text-sm',
      },
    },
    defaultVariants: { intent: 'default', size: 'sm' },
  },
);
