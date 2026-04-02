import { useState } from 'react';

type Props = {
  open: boolean;
  onClose: () => void;
};

const steps = [
  {
    title: 'Welcome to PM AI Tool',
    desc: 'Your AI-powered product management workspace. Let\'s get you set up in just a few steps.',
    icon: '🚀',
    content: (
      <div className="flex flex-col items-center gap-4 py-6">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl text-3xl" style={{ background: 'linear-gradient(135deg, var(--indigo) 0%, #7C5BF8 100%)', boxShadow: '0 8px 24px rgba(91,126,248,0.4)' }}>
          <span className="text-white font-bold text-2xl" style={{ fontFamily: "'Syne', sans-serif" }}>PM</span>
        </div>
        <p className="max-w-sm text-center text-sm text-[var(--text-secondary)]">Generate comprehensive PRDs from Jira tickets, create wireframes, collaborate with your team — all powered by AI.</p>
      </div>
    ),
  },
  {
    title: 'Connect Your AI Provider',
    desc: 'Set up at least one AI provider to start generating PRDs and wireframes.',
    icon: '🧠',
    content: (
      <div className="space-y-3 py-4">
        {[
          { name: 'OpenAI (GPT-4o)', icon: '🟢', desc: 'Recommended — Best quality PRD generation' },
          { name: 'Claude (Anthropic)', icon: '🟣', desc: 'Great for detailed technical specs' },
          { name: 'Gemini (Google)', icon: '🔵', desc: 'Fast and cost-effective' },
        ].map((p) => (
          <div key={p.name} className="flex items-center gap-3 rounded-xl border p-3 transition-all hover:border-[var(--border-light)]" style={{ background: 'var(--bg-base)', borderColor: 'var(--border)' }}>
            <span className="text-lg">{p.icon}</span>
            <div className="flex-1">
              <div className="text-[13px] font-semibold text-[var(--text-primary)]">{p.name}</div>
              <div className="text-[11px] text-[var(--text-muted)]">{p.desc}</div>
            </div>
          </div>
        ))}
        <p className="text-center text-[11px] text-[var(--text-muted)]">You can configure API keys anytime in Settings → Language Models</p>
      </div>
    ),
  },
  {
    title: 'Connect Integrations',
    desc: 'Link Jira and Figma to unlock the full power of PM AI Tool.',
    icon: '🔗',
    content: (
      <div className="space-y-3 py-4">
        {[
          { name: 'Jira', icon: '🔗', desc: 'Import tickets → auto-generate PRDs', connected: false },
          { name: 'Figma', icon: '🎨', desc: 'Sync wireframes bidirectionally', connected: false },
          { name: 'Slack', icon: '💬', desc: 'Get notified about PRD updates', connected: false },
        ].map((i) => (
          <div key={i.name} className="flex items-center gap-3 rounded-xl border p-3" style={{ background: 'var(--bg-base)', borderColor: 'var(--border)' }}>
            <span className="text-lg">{i.icon}</span>
            <div className="flex-1">
              <div className="text-[13px] font-semibold text-[var(--text-primary)]">{i.name}</div>
              <div className="text-[11px] text-[var(--text-muted)]">{i.desc}</div>
            </div>
            <span className="rounded-full px-2 py-0.5 text-[10px] font-bold" style={{ background: 'var(--bg-active)', color: 'var(--text-muted)' }}>Setup in Settings</span>
          </div>
        ))}
      </div>
    ),
  },
  {
    title: 'You\'re All Set!',
    desc: 'Start creating your first AI-generated PRD right now.',
    icon: '✨',
    content: (
      <div className="flex flex-col items-center gap-4 py-6">
        <div className="text-5xl">🎉</div>
        <p className="max-w-sm text-center text-sm text-[var(--text-secondary)]">
          Head to the Dashboard and click <strong>"Generate with AI"</strong> to create your first PRD, or browse the Templates page to explore available templates.
        </p>
        <div className="flex gap-4 text-[13px]">
          <div className="flex items-center gap-1.5 text-[var(--text-muted)]">
            <span className="text-[var(--green)]">✓</span> AI Generation
          </div>
          <div className="flex items-center gap-1.5 text-[var(--text-muted)]">
            <span className="text-[var(--green)]">✓</span> Real-time Collab
          </div>
          <div className="flex items-center gap-1.5 text-[var(--text-muted)]">
            <span className="text-[var(--green)]">✓</span> Export & Share
          </div>
        </div>
      </div>
    ),
  },
];

export function OnboardingWizard({ open, onClose }: Props) {
  const [step, setStep] = useState(0);

  if (!open) return null;

  const current = steps[step];
  const isLast = step === steps.length - 1;

  function finish() {
    localStorage.setItem('pm_ai_onboarded', '1');
    onClose();
  }

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(12px)' }}>
      <div className="animate-modal-in w-[520px] max-w-[95vw] rounded-2xl border shadow-2xl" style={{ background: 'var(--bg-elevated)', borderColor: 'var(--border-light)', boxShadow: '0 40px 80px rgba(0,0,0,0.6)' }}>
        {/* Progress bar */}
        <div className="px-6 pt-5">
          <div className="flex gap-1.5">
            {steps.map((_, i) => (
              <div key={i} className="h-1 flex-1 rounded-full transition-all" style={{ background: i <= step ? 'var(--indigo)' : 'var(--bg-active)' }} />
            ))}
          </div>
          <div className="mt-1 text-right text-[10px] text-[var(--text-muted)]">{step + 1} of {steps.length}</div>
        </div>

        <div className="px-6 pb-4 pt-3 text-center">
          <span className="mb-2 inline-block text-3xl">{current.icon}</span>
          <h2 className="font-heading text-xl font-bold text-[var(--text-primary)]">{current.title}</h2>
          <p className="mt-1.5 text-sm text-[var(--text-muted)]">{current.desc}</p>
        </div>

        <div className="px-6">{current.content}</div>

        <div className="flex items-center justify-between px-6 py-4">
          <button
            type="button"
            className="text-[13px] font-medium transition-colors"
            style={{ color: 'var(--text-muted)' }}
            onClick={finish}
          >
            Skip setup
          </button>
          <div className="flex gap-2">
            {step > 0 && (
              <button
                type="button"
                className="rounded-lg border px-4 py-2 text-[13px] font-medium transition-all"
                style={{ background: 'var(--bg-elevated)', color: 'var(--text-secondary)', borderColor: 'var(--border-light)' }}
                onClick={() => setStep(step - 1)}
              >
                Back
              </button>
            )}
            <button
              type="button"
              className="rounded-lg px-4 py-2 text-[13px] font-medium text-white transition-all hover:-translate-y-0.5"
              style={{ background: 'var(--indigo)', boxShadow: '0 2px 8px rgba(91,126,248,0.35)' }}
              onClick={() => isLast ? finish() : setStep(step + 1)}
            >
              {isLast ? 'Get Started' : 'Next'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
