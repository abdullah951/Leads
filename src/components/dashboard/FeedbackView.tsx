'use client';

// ── FeedbackView ───────────────────────────────────────────────────────────────
// Feedback & Suggestions page.
//
// Sections (top → bottom):
//   1. Mood bar      — 5 emoji buttons (😡→😍); clicking one opens the form
//   2. Category bento cards — Bug 🐛 | Feature ✨ | General 💬
//   3. Form          — Title + Description + Send button
//   4. Success state — confetti burst + "Got it!" illustration
//   5. Community feed — upvoteable cards with status badges
//
// Layout: ml-[160px] pt-14 (NavRail 160px + TopBar 56px)
// ──────────────────────────────────────────────────────────────────────────────

import { useCallback, useEffect, useRef, useState } from 'react';
import { API_ROUTES } from '@/constants/apiRoutes';

// ── Types ──────────────────────────────────────────────────────────────────────

type Category = 'bug' | 'feature' | 'general';

type FeedbackItem = {
  id: number;
  category: Category;
  mood: number | null;
  title: string;
  message: string;
  status: string;  // open | investigating | planned | in-progress | completed | declined
  votes: number;
  userVoted: boolean;
  createdAt: string;
};

// ── Constants ──────────────────────────────────────────────────────────────────

/** Emoji options for the mood bar — index 0 = worst, 4 = best */
const MOODS = [
  { emoji: '😡', label: 'Terrible', score: 1 },
  { emoji: '🙁', label: 'Bad',      score: 2 },
  { emoji: '😐', label: 'Okay',     score: 3 },
  { emoji: '🙂', label: 'Good',     score: 4 },
  { emoji: '😍', label: 'Love it',  score: 5 },
];

/** Category bento cards */
const CATEGORIES: { key: Category; emoji: string; label: string; desc: string; accent: string }[] = [
  {
    key: 'bug',
    emoji: '🐛',
    label: 'Report a bug',
    desc: 'Something is broken or behaving unexpectedly.',
    accent: '#ef4444',
  },
  {
    key: 'feature',
    emoji: '✨',
    label: 'Request a feature',
    desc: 'An idea that would make WarpLeads better.',
    accent: '#f59e0b',
  },
  {
    key: 'general',
    emoji: '💬',
    label: 'General feedback',
    desc: 'Anything else — thoughts, praise, questions.',
    accent: '#6366f1',
  },
];

/** Status badge styles */
const STATUS_META: Record<string, { label: string; emoji: string; bg: string; text: string }> = {
  open:          { label: 'Open',        emoji: '📬', bg: '#6366f122', text: '#818cf8' },
  investigating: { label: 'Investigating', emoji: '🔍', bg: '#f59e0b22', text: '#fbbf24' },
  planned:       { label: 'Planned',     emoji: '🗓️',  bg: '#3b82f622', text: '#60a5fa' },
  'in-progress': { label: 'In progress', emoji: '🛠️',  bg: '#8b5cf622', text: '#a78bfa' },
  completed:     { label: 'Completed',   emoji: '✅',  bg: '#22c55e22', text: '#4ade80' },
  declined:      { label: 'Declined',    emoji: '🚫',  bg: '#6b728022', text: '#9ca3af' },
};

/** Feed filter tab */
const FILTER_TABS: { key: Category | 'all'; label: string }[] = [
  { key: 'all',     label: '⭐ All' },
  { key: 'bug',     label: '🐛 Bugs' },
  { key: 'feature', label: '✨ Features' },
  { key: 'general', label: '💬 General' },
];

// ── Confetti burst ─────────────────────────────────────────────────────────────

/**
 * Renders a handful of coloured confetti squares that animate outward from
 * the centre and fade out. Pure CSS — no library needed.
 */
function Confetti() {
  // 20 pieces with randomised colours, angles and distances
  const pieces = Array.from({ length: 20 }, (_, i) => {
    const angle = (i / 20) * 360;
    const dist = 60 + Math.random() * 80;
    const dx = Math.cos((angle * Math.PI) / 180) * dist;
    const dy = Math.sin((angle * Math.PI) / 180) * dist;
    const colors = ['#6366f1', '#f59e0b', '#22c55e', '#ef4444', '#ec4899', '#3b82f6'];
    const color = colors[i % colors.length]!;
    const size = 6 + Math.random() * 6;
    return { dx, dy, color, size, delay: Math.random() * 0.3 };
  });

  return (
    <div style={{ position: 'relative', width: 0, height: 0 }}>
      {pieces.map((p, i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            width: p.size,
            height: p.size,
            backgroundColor: p.color,
            borderRadius: 2,
            top: -p.size / 2,
            left: -p.size / 2,
            // CSS animation: fly out + fade
            animation: `confettiFly 0.8s ease-out ${p.delay}s both`,
            // Custom property for the translate target — injected via style
            // @ts-expect-error -- CSS custom properties
            '--dx': `${p.dx}px`,
            '--dy': `${p.dy}px`,
          }}
        />
      ))}
      {/* Keyframes injected once as a style tag */}
      <style>{`
        @keyframes confettiFly {
          0%   { transform: translate(0, 0) rotate(0deg); opacity: 1; }
          100% { transform: translate(var(--dx), var(--dy)) rotate(360deg); opacity: 0; }
        }
      `}</style>
    </div>
  );
}

// ── Success Screen ─────────────────────────────────────────────────────────────

/** Full success state shown after a feedback submission */
function SuccessScreen(props: { onReset: () => void }) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 16,
        padding: '60px 20px',
        textAlign: 'center',
      }}
    >
      {/* Confetti burst centred on the glass */}
      <div style={{ position: 'relative', marginBottom: 8 }}>
        <Confetti />
        {/* Big hero emoji */}
        <div style={{ fontSize: 64, lineHeight: 1 }}>🥂</div>
      </div>

      <h2 style={{ fontSize: 26, fontWeight: 800, color: 'var(--color-text-primary)', margin: 0 }}>
        Got it!
      </h2>
      <p style={{ fontSize: 15, color: 'var(--color-text-muted)', maxWidth: 340, margin: 0, lineHeight: 1.6 }}>
        Our product team is on it. Your feedback shapes WarpLeads — thank you for taking the time. 🙌
      </p>

      {/* Best-feedback-of-the-month teaser */}
      <div
        style={{
          marginTop: 8,
          padding: '10px 20px',
          backgroundColor: '#f59e0b18',
          border: '1px solid #f59e0b44',
          borderRadius: 'var(--radius-md)',
          fontSize: 13,
          color: '#fbbf24',
          maxWidth: 380,
        }}
      >
        🏆 Best feedback of the month gets <strong>100 free credits</strong>!
      </div>

      <button
        onClick={props.onReset}
        style={{
          marginTop: 12,
          padding: '10px 28px',
          backgroundColor: 'var(--color-brand)',
          border: 'none',
          borderRadius: 'var(--radius-md)',
          color: '#fff',
          fontSize: 14,
          fontWeight: 600,
          cursor: 'pointer',
        }}
      >
        Submit more feedback
      </button>
    </div>
  );
}

// ── Feed Card ──────────────────────────────────────────────────────────────────

/** One card in the community "Wall of Love & Ideas" feed */
function FeedCard(props: {
  item: FeedbackItem;
  onVote: (id: number) => void;
  voting: boolean;
}) {
  const { item } = props;
  const cat = CATEGORIES.find(c => c.key === item.category)!;
  const statusMeta = STATUS_META[item.status] ?? STATUS_META.open!;

  return (
    <div
      style={{
        display: 'flex',
        gap: 16,
        padding: '16px 20px',
        backgroundColor: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-lg)',
        transition: 'border-color 0.15s',
      }}
      className="hover:border-[var(--color-brand)]"
    >
      {/* ── Upvote column ── */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, flexShrink: 0 }}>
        <button
          onClick={() => props.onVote(item.id)}
          disabled={props.voting}
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 3,
            padding: '8px 12px',
            backgroundColor: item.userVoted ? 'var(--color-brand-light)' : 'var(--color-surface-subtle)',
            border: `1px solid ${item.userVoted ? 'var(--color-brand)' : 'var(--color-border)'}`,
            borderRadius: 'var(--radius-md)',
            cursor: props.voting ? 'not-allowed' : 'pointer',
            transition: 'all 0.15s',
            minWidth: 44,
          }}
        >
          {/* Upvote chevron */}
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke={item.userVoted ? 'var(--color-brand)' : 'var(--color-text-muted)'}
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="18 15 12 9 6 15" />
          </svg>
          {/* Vote count */}
          <span
            style={{
              fontSize: 13,
              fontWeight: 700,
              color: item.userVoted ? 'var(--color-brand)' : 'var(--color-text-secondary)',
              lineHeight: 1,
            }}
          >
            {item.votes}
          </span>
        </button>
      </div>

      {/* ── Content column ── */}
      <div style={{ flex: 1, minWidth: 0 }}>
        {/* Title row: category chip + status badge + title */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 6 }}>
          {/* Category chip */}
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              padding: '2px 8px',
              backgroundColor: `${cat?.accent ?? '#6366f1'}18`,
              border: `1px solid ${cat?.accent ?? '#6366f1'}44`,
              borderRadius: 9999,
              fontSize: 11,
              fontWeight: 600,
              color: cat?.accent ?? '#818cf8',
            }}
          >
            {cat?.emoji} {cat?.label}
          </span>

          {/* Status badge */}
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              padding: '2px 8px',
              backgroundColor: statusMeta.bg,
              border: `1px solid ${statusMeta.text}44`,
              borderRadius: 9999,
              fontSize: 11,
              fontWeight: 600,
              color: statusMeta.text,
            }}
          >
            {statusMeta.emoji} {statusMeta.label}
          </span>
        </div>

        {/* Title */}
        <p
          style={{
            fontSize: 14,
            fontWeight: 600,
            color: 'var(--color-text-primary)',
            margin: '0 0 4px',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {item.title}
        </p>

        {/* Description preview — max 2 lines */}
        {item.message && (
          <p
            style={{
              fontSize: 13,
              color: 'var(--color-text-muted)',
              margin: 0,
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
              lineHeight: 1.5,
            }}
          >
            {item.message}
          </p>
        )}
      </div>
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────

/**
 * Feedback & Suggestions page.
 * Composes the mood bar, category bento cards, submission form,
 * success screen, and community upvote feed.
 */
export function FeedbackView() {
  // ── Form state ─────────────────────────────────────────────────────────────

  // Mood selected from the emoji bar (1–5); null = not chosen yet
  const [mood, setMood] = useState<number | null>(null);
  // Hovered mood for hover preview
  const [hoveredMood, setHoveredMood] = useState<number | null>(null);
  // Active category bento card
  const [category, setCategory] = useState<Category>('general');
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  // Whether the form panel is visible (opens when mood is clicked or category is selected)
  const [formOpen, setFormOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Ref for the title input so we can auto-focus when form opens
  const titleRef = useRef<HTMLInputElement>(null);

  // ── Feed state ─────────────────────────────────────────────────────────────

  const [feedItems, setFeedItems] = useState<FeedbackItem[]>([]);
  const [feedLoading, setFeedLoading] = useState(true);
  const [feedFilter, setFeedFilter] = useState<Category | 'all'>('all');
  // Which item is currently being voted on (shows disabled state)
  const [votingId, setVotingId] = useState<number | null>(null);

  // ── Fetch feed ─────────────────────────────────────────────────────────────

  /** Loads the community feedback feed for the current filter tab */
  const fetchFeed = useCallback(async (cat: Category | 'all') => {
    setFeedLoading(true);
    try {
      const res = await fetch(API_ROUTES.feedback.list, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category: cat === 'all' ? undefined : cat, pageSize: 30 }),
      });
      if (res.ok) {
        const data = await res.json() as { items: FeedbackItem[] };
        setFeedItems(data.items);
      }
    } finally {
      setFeedLoading(false);
    }
  }, []);

  useEffect(() => { fetchFeed(feedFilter); }, [fetchFeed, feedFilter]);

  // ── Handlers ───────────────────────────────────────────────────────────────

  /** Opens the form panel and focuses the title field */
  function openForm() {
    setFormOpen(true);
    setTimeout(() => titleRef.current?.focus(), 100);
  }

  /** Clicking a mood emoji selects it and opens the form */
  function handleMoodClick(score: number) {
    setMood(score);
    openForm();
  }

  /** Clicking a category bento card selects it and opens the form */
  function handleCategoryClick(cat: Category) {
    setCategory(cat);
    openForm();
  }

  /** Submits the feedback form */
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const res = await fetch(API_ROUTES.feedback.submit, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category, mood, title: title.trim(), message: message.trim() }),
      });
      if (!res.ok) {
        const d = await res.json() as { error?: string };
        throw new Error(d.error ?? 'Submission failed');
      }
      setSubmitted(true);
      // Refresh the feed in the background so the new item appears
      fetchFeed(feedFilter);
    } catch (err: unknown) {
      setSubmitError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setSubmitting(false);
    }
  }

  /** Resets the form to its initial state after the success screen */
  function handleReset() {
    setMood(null);
    setCategory('general');
    setTitle('');
    setMessage('');
    setFormOpen(false);
    setSubmitted(false);
    setSubmitError(null);
  }

  /** Toggles an upvote on a community feed item */
  async function handleVote(feedbackId: number) {
    if (votingId !== null) return;
    setVotingId(feedbackId);
    try {
      const res = await fetch(API_ROUTES.feedback.vote, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ feedbackId }),
      });
      if (res.ok) {
        const data = await res.json() as { votes: number; userVoted: boolean };
        // Update the item in local state — optimistic-style patch
        setFeedItems(prev =>
          prev.map(item =>
            item.id === feedbackId
              ? { ...item, votes: data.votes, userVoted: data.userVoted }
              : item,
          ),
        );
      }
    } finally {
      setVotingId(null);
    }
  }

  // ── Derived display mood for the bar ──────────────────────────────────────

  // Show hover preview if hovering, otherwise show selected mood label
  const displayMoodScore = hoveredMood ?? mood;
  const displayMoodLabel = displayMoodScore !== null
    ? MOODS.find(m => m.score === displayMoodScore)?.label ?? ''
    : 'How are you feeling about WarpLeads today?';

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    // Content area — offset for NavRail + TopBar
    <div
      className="ml-[160px] pt-14 min-h-screen"
      style={{ backgroundColor: 'var(--color-bg)' }}
    >
      <div style={{ maxWidth: 760, margin: '0 auto', padding: '32px 24px 60px' }}>

        {/* ── Page title row ──────────────────────────────────────────────── */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 32, flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h1 style={{ fontSize: 26, fontWeight: 800, color: 'var(--color-text-primary)', margin: 0, letterSpacing: '-0.01em' }}>
              Feedback &amp; Suggestions
            </h1>
            <p style={{ fontSize: 14, color: 'var(--color-text-muted)', margin: '5px 0 0' }}>
              Help us build the future of WarpLeads.
            </p>
          </div>

          {/* View Roadmap CTA */}
          {/* <a
            href="https://warpleads.com/roadmap"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '9px 16px',
              backgroundColor: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-md)',
              fontSize: 13,
              fontWeight: 600,
              color: 'var(--color-text-secondary)',
              textDecoration: 'none',
              transition: 'border-color 0.15s',
            }}
            className="hover:border-[var(--color-brand)] hover:text-[var(--color-brand)]"
          >
            📢 View roadmap
          </a> */}
        </div>

        {/* ── Submission panel ────────────────────────────────────────────── */}
        <div
          style={{
            backgroundColor: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-xl)',
            overflow: 'hidden',
            marginBottom: 36,
          }}
        >
          {submitted
            ? (
                /* Success screen replaces the entire form section */
                <SuccessScreen onReset={handleReset} />
              )
            : (
                <>
                  {/* ── Mood bar ─────────────────────────────────────────── */}
                  <div
                    style={{
                      padding: '24px 28px 20px',
                      borderBottom: '1px solid var(--color-border)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 14,
                      alignItems: 'center',
                    }}
                  >
                    {/* Prompt label — transitions to mood label on hover/selection */}
                    <p
                      style={{
                        fontSize: 15,
                        fontWeight: 600,
                        color: displayMoodScore
                          ? MOODS.find(m => m.score === displayMoodScore)?.score === 5 ? '#818cf8'
                          : displayMoodScore >= 4 ? '#22c55e'
                          : displayMoodScore === 3 ? '#f59e0b'
                          : '#ef4444'
                          : 'var(--color-text-secondary)',
                        margin: 0,
                        transition: 'color 0.2s',
                        textAlign: 'center',
                      }}
                    >
                      {displayMoodLabel}
                    </p>

                    {/* Emoji buttons */}
                    <div style={{ display: 'flex', gap: 10 }}>
                      {MOODS.map(m => {
                        const isSelected = mood === m.score;
                        const isHovered = hoveredMood === m.score;
                        return (
                          <button
                            key={m.score}
                            onClick={() => handleMoodClick(m.score)}
                            onMouseEnter={() => setHoveredMood(m.score)}
                            onMouseLeave={() => setHoveredMood(null)}
                            style={{
                              background: isSelected ? 'var(--color-brand-light)' : 'none',
                              border: `2px solid ${isSelected ? 'var(--color-brand)' : 'transparent'}`,
                              borderRadius: 'var(--radius-md)',
                              padding: '6px 10px',
                              cursor: 'pointer',
                              fontSize: isHovered || isSelected ? 34 : 28,
                              lineHeight: 1,
                              transition: 'all 0.15s',
                              transform: isHovered || isSelected ? 'translateY(-3px) scale(1.1)' : 'none',
                            }}
                            title={m.label}
                          >
                            {m.emoji}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* ── Category bento cards ─────────────────────────────── */}
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(3, 1fr)',
                      gap: 12,
                      padding: '20px 28px',
                      borderBottom: formOpen ? '1px solid var(--color-border)' : 'none',
                    }}
                  >
                    {CATEGORIES.map(cat => {
                      const isActive = category === cat.key && formOpen;
                      return (
                        <button
                          key={cat.key}
                          onClick={() => handleCategoryClick(cat.key)}
                          style={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 8,
                            padding: '16px',
                            backgroundColor: isActive ? `${cat.accent}18` : 'var(--color-surface-subtle)',
                            border: `1.5px solid ${isActive ? cat.accent : 'var(--color-border)'}`,
                            borderRadius: 'var(--radius-lg)',
                            cursor: 'pointer',
                            textAlign: 'left',
                            transition: 'all 0.15s',
                            boxShadow: isActive ? `0 0 14px ${cat.accent}33` : 'none',
                          }}
                          className={!isActive ? 'hover:border-[var(--color-text-muted)]' : ''}
                        >
                          {/* Icon */}
                          <span style={{ fontSize: 24 }}>{cat.emoji}</span>
                          {/* Label */}
                          <span
                            style={{
                              fontSize: 13,
                              fontWeight: 700,
                              color: isActive ? cat.accent : 'var(--color-text-primary)',
                              lineHeight: 1.2,
                            }}
                          >
                            {cat.label}
                          </span>
                          {/* Description */}
                          <span style={{ fontSize: 11, color: 'var(--color-text-muted)', lineHeight: 1.4 }}>
                            {cat.desc}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  {/* ── Expandable form ───────────────────────────────────── */}
                  {formOpen && (
                    <form
                      onSubmit={handleSubmit}
                      style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: '20px 28px 24px' }}
                    >
                      {/* Title field */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-secondary)' }}>
                          Title
                          <span style={{ color: 'var(--color-brand)', marginLeft: 3 }}>*</span>
                        </label>
                        <input
                          ref={titleRef}
                          type="text"
                          required
                          maxLength={120}
                          placeholder="Brief summary of your feedback…"
                          value={title}
                          onChange={e => setTitle(e.target.value)}
                          style={{
                            padding: '10px 14px',
                            backgroundColor: 'var(--color-surface-subtle)',
                            border: '1px solid var(--color-border)',
                            borderRadius: 'var(--radius-md)',
                            color: 'var(--color-text-primary)',
                            fontSize: 14,
                            outline: 'none',
                          }}
                        />
                      </div>

                      {/* Description textarea */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-secondary)' }}>
                          Description
                          <span style={{ fontSize: 11, fontWeight: 400, marginLeft: 6, color: 'var(--color-text-muted)' }}>optional</span>
                        </label>
                        <textarea
                          rows={4}
                          maxLength={2000}
                          placeholder="More details, reproduction steps, or context…"
                          value={message}
                          onChange={e => setMessage(e.target.value)}
                          style={{
                            padding: '10px 14px',
                            backgroundColor: 'var(--color-surface-subtle)',
                            border: '1px solid var(--color-border)',
                            borderRadius: 'var(--radius-md)',
                            color: 'var(--color-text-primary)',
                            fontSize: 14,
                            outline: 'none',
                            resize: 'vertical',
                            fontFamily: 'inherit',
                            lineHeight: 1.5,
                          }}
                        />
                        {/* Character counter */}
                        <span style={{ fontSize: 11, color: 'var(--color-text-muted)', alignSelf: 'flex-end' }}>
                          {message.length} / 2000
                        </span>
                      </div>

                      {/* Error banner */}
                      {submitError && (
                        <div
                          style={{
                            padding: '10px 14px',
                            backgroundColor: '#ef444422',
                            border: '1px solid #ef444444',
                            borderRadius: 'var(--radius-md)',
                            color: '#f87171',
                            fontSize: 13,
                          }}
                        >
                          {submitError}
                        </div>
                      )}

                      {/* Credits incentive note */}
                      <div
                        style={{
                          padding: '10px 14px',
                          backgroundColor: '#f59e0b12',
                          border: '1px solid #f59e0b33',
                          borderRadius: 'var(--radius-md)',
                          fontSize: 12,
                          color: '#fbbf24',
                        }}
                      >
                        🏆 Best feedback of the month earns <strong>100 free credits</strong>. Make it count!
                      </div>

                      {/* Action buttons */}
                      <div style={{ display: 'flex', gap: 10 }}>
                        <button
                          type="button"
                          onClick={() => setFormOpen(false)}
                          style={{
                            padding: '10px 20px',
                            backgroundColor: 'var(--color-surface-subtle)',
                            border: '1px solid var(--color-border)',
                            borderRadius: 'var(--radius-md)',
                            color: 'var(--color-text-secondary)',
                            fontSize: 14,
                            cursor: 'pointer',
                          }}
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          disabled={submitting || !title.trim()}
                          style={{
                            flex: 1,
                            padding: '10px 20px',
                            backgroundColor: 'var(--color-brand)',
                            border: 'none',
                            borderRadius: 'var(--radius-md)',
                            color: '#fff',
                            fontSize: 14,
                            fontWeight: 700,
                            cursor: submitting || !title.trim() ? 'not-allowed' : 'pointer',
                            opacity: submitting || !title.trim() ? 0.65 : 1,
                            transition: 'opacity 0.15s',
                          }}
                        >
                          {submitting ? 'Sending…' : '🚀 Send feedback'}
                        </button>
                      </div>
                    </form>
                  )}
                </>
              )}
        </div>

        {/* ── Community feed ──────────────────────────────────────────────── */}
        <section>
          {/* Feed header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--color-text-primary)', margin: 0 }}>
              Recent suggestions
            </h2>

            {/* Filter tabs */}
            <div style={{ display: 'flex', gap: 6 }}>
              {FILTER_TABS.map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setFeedFilter(tab.key)}
                  style={{
                    padding: '5px 12px',
                    fontSize: 12,
                    fontWeight: 600,
                    borderRadius: 9999,
                    border: `1px solid ${feedFilter === tab.key ? 'var(--color-brand)' : 'var(--color-border)'}`,
                    backgroundColor: feedFilter === tab.key ? 'var(--color-brand-light)' : 'var(--color-surface)',
                    color: feedFilter === tab.key ? 'var(--color-brand)' : 'var(--color-text-muted)',
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Horizontal separator */}
          <div style={{ height: 1, backgroundColor: 'var(--color-border)', marginBottom: 16, opacity: 0.5 }} />

          {feedLoading
            ? (
                /* Skeleton cards */
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {[1, 2, 3, 4].map(i => (
                    <div
                      key={i}
                      className="animate-pulse"
                      style={{
                        height: 80,
                        backgroundColor: 'var(--color-surface)',
                        border: '1px solid var(--color-border)',
                        borderRadius: 'var(--radius-lg)',
                      }}
                    />
                  ))}
                </div>
              )
            : feedItems.length === 0
              ? (
                  /* Empty state for the feed */
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: 12,
                      padding: '48px 20px',
                      textAlign: 'center',
                    }}
                  >
                    <span style={{ fontSize: 40 }}>💭</span>
                    <p style={{ fontSize: 14, color: 'var(--color-text-muted)', margin: 0 }}>
                      No suggestions yet. Be the first to share your ideas!
                    </p>
                  </div>
                )
              : (
                  /* Feed card list */
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {feedItems.map(item => (
                      <FeedCard
                        key={item.id}
                        item={item}
                        onVote={handleVote}
                        voting={votingId === item.id}
                      />
                    ))}
                  </div>
                )}
        </section>
      </div>
    </div>
  );
}
