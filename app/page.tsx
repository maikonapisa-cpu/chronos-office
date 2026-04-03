'use client';
import { useEffect, useState } from 'react';

function parseNaturalLanguageEvent(input: string) {
  const text = input.trim();
  const now = new Date();
  const lower = text.toLowerCase();

  let date = new Date(now);
  if (lower.includes('tomorrow')) {
    date.setDate(date.getDate() + 1);
  } else if (lower.includes('next week')) {
    date.setDate(date.getDate() + 7);
  }

  const dateMatch = text.match(/\b(\d{4}-\d{2}-\d{2})\b/);
  if (dateMatch?.[1]) {
    date = new Date(dateMatch[1]);
  }

  const timeMatch = text.match(/\b(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\b/i);
  let startTime = '12:00';
  if (timeMatch) {
    let hour = Number(timeMatch[1]);
    const minute = timeMatch[2] || '00';
    const meridiem = timeMatch[3]?.toLowerCase();
    if (meridiem === 'pm' && hour < 12) hour += 12;
    if (meridiem === 'am' && hour === 12) hour = 0;
    startTime = `${String(hour).padStart(2, '0')}:${minute}`;
  }

  let endTime = '13:00';
  const rangeMatch = text.match(/to\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i);
  if (rangeMatch) {
    let hour = Number(rangeMatch[1]);
    const minute = rangeMatch[2] || '00';
    const meridiem = rangeMatch[3]?.toLowerCase();
    if (meridiem === 'pm' && hour < 12) hour += 12;
    if (meridiem === 'am' && hour === 12) hour = 0;
    endTime = `${String(hour).padStart(2, '0')}:${minute}`;
  } else {
    const startHour = Number(startTime.slice(0, 2));
    const startMinute = Number(startTime.slice(3, 5));
    const end = new Date(date);
    end.setHours(startHour);
    end.setMinutes(startMinute + 60);
    const endHour = end.getHours();
    const endMinute = end.getMinutes();
    endTime = `${String(endHour).padStart(2, '0')}:${String(endMinute).padStart(2, '0')}`;
  }

  const cleaned = text
    .replace(/\btomorrow\b/i, '')
    .replace(/\bnext week\b/i, '')
    .replace(/\bto\s+\d{1,2}(?::\d{2})?\s*(?:am|pm)?\b/i, '')
    .replace(/\b\d{4}-\d{2}-\d{2}\b/, '')
    .replace(/\b\d{1,2}(?::\d{2})?\s*(?:am|pm)?\b/i, '')
    .replace(/\s+/g, ' ')
    .trim();

  const summary = cleaned.replace(/^(add|schedule|set up|create)\s+/i, '').trim() || text;

  return {
    summary,
    date: date.toISOString().slice(0, 10),
    time: startTime,
    endTime,
  };
}

export default function Home() {
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedAgent, setSelectedAgent] = useState<'chronos' | 'researcher' | null>(null);
  const [newEventSummary, setNewEventSummary] = useState('Lae\'s birthday');
  const [newEventDate, setNewEventDate] = useState('2026-04-04');
  const [newEventTime, setNewEventTime] = useState('12:00');
  const [newEventEndTime, setNewEventEndTime] = useState('13:00');
  const [naturalInput, setNaturalInput] = useState('add lunch with my dad tomorrow at 12 PM to 1 PM');
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [commandText, setCommandText] = useState('add lunch with my parents and brother tomorrow from 12 PM to 1 PM');

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError('');
        const res = await fetch('/api/calendar');
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || 'Failed to load calendar');
        setEvents(Array.isArray(data?.events) ? data.events : []);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load calendar');
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, []);

  const today = events.slice(0, 3);
  const nextThreeDays = events.slice(3, 6);

  return (
    <main style={styles.main}>
      <header style={styles.topbar}>
        <div>
          <p style={styles.kicker}>Chronos Office</p>
          <h1 style={styles.title}>Your personal agent dashboard</h1>
        </div>
        <div style={styles.statusPill}>Paper mode • local only</div>
      </header>

      <section style={styles.office}>
        <div style={styles.wall} />

        <div style={styles.chris} title="Chris — boss / coordinator">
          <div style={styles.spriteHeadChris} />
          <div style={styles.spriteBodyChris} />
          <div style={styles.nameTag}>Chris</div>
          <div style={styles.roleTag}>Boss</div>
        </div>

        <div style={styles.chronosDesk} />

        <div
          style={styles.chronos}
          title="Chronos — calendar agent"
          onClick={() => setSelectedAgent((current) => (current === 'chronos' ? null : 'chronos'))}
        >
          <div style={styles.spriteHeadChronos} />
          <div style={styles.spriteBodyChronos} />
          <div style={styles.nameTag}>Chronos</div>
          <div style={styles.roleTag}>Calendar Agent</div>
        </div>

        <div style={styles.researcherDesk} />

        <div
          style={styles.researcher}
          title="Researcher — intelligence agent"
          onClick={() => setSelectedAgent((current) => (current === 'researcher' ? null : 'researcher'))}
        >
          <div style={styles.spriteHeadResearcher} />
          <div style={styles.spriteBodyResearcher} />
          <div style={styles.nameTag}>Researcher</div>
          <div style={styles.roleTag}>Intelligence Agent</div>
        </div>

        {selectedAgent === 'researcher' && (
          <aside style={styles.popup}>
            <button style={styles.closeButton} onClick={() => setSelectedAgent(null)}>×</button>
            <h2 style={styles.panelTitle}>Researcher</h2>
            <p style={styles.popupSub}>intelligence & news agent</p>
            <div style={styles.formBox}>
              <h3 style={styles.popupSection}>Status</h3>
              <p style={styles.popupSub}>Ready to find the latest OpenClaw and AI news.</p>
              <p style={styles.popupSub}><strong>Topics:</strong> OpenClaw updates, AI ecosystem news</p>
              <p style={styles.popupSub}><strong>Output:</strong> News briefs + posting packets</p>
              <p style={styles.popupSub}><strong>For:</strong> Poster agent (coming soon)</p>
            </div>
            <div style={styles.formBox}>
              <h3 style={styles.popupSection}>Next</h3>
              <p style={styles.popupSub}>Waiting for Chris to delegate research tasks.</p>
            </div>
          </aside>
        )}

        {selectedAgent === 'chronos' && (
          <aside style={styles.popup}>
            <button style={styles.closeButton} onClick={() => setSelectedAgent(null)}>×</button>
            <button style={styles.plusButton} onClick={() => setShowAddForm((v) => !v)}>{showAddForm ? '−' : '+'}</button>
            <h2 style={styles.panelTitle}>Chronos</h2>
            <p style={styles.popupSub}>{loading ? 'checking your calendar now…' : error ? error : 'upcoming events'}</p>

            <div style={styles.formBox}>
              <h3 style={styles.popupSection}>Command</h3>
              <textarea
                style={styles.textarea}
                value={commandText}
                onChange={(e) => setCommandText(e.target.value)}
                placeholder="Tell Chronos what to do"
                rows={3}
              />
              <button
                style={styles.secondaryButton}
                onClick={async () => {
                  try {
                    setSaving(true);
                    setSaveMessage('');
                    const res = await fetch('/api/command', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ text: commandText }),
                    });
                    const data = await res.json();
                    if (!res.ok) throw new Error(data?.error || 'Command failed');
                    setSaveMessage(`Created: ${data?.event?.summary || 'event'}`);
                    const refresh = await fetch('/api/calendar');
                    const refreshed = await refresh.json();
                    setEvents(Array.isArray(refreshed?.events) ? refreshed.events : []);
                  } catch (e) {
                    setSaveMessage(e instanceof Error ? e.message : 'Command failed');
                  } finally {
                    setSaving(false);
                  }
                }}
              >
                Send to Chronos
              </button>
            </div>

            {showAddForm && (
              <div style={styles.formBox}>
                <h3 style={styles.popupSection}>Add event</h3>
                <p style={styles.popupSub}>Chronos can now create timed events.</p>
                <textarea
                  style={styles.textarea}
                  value={naturalInput}
                  onChange={(e) => setNaturalInput(e.target.value)}
                  placeholder="Tell Chronos what to add"
                  rows={3}
                />
                <button
                  style={styles.secondaryButton}
                  onClick={() => {
                    const parsed = parseNaturalLanguageEvent(naturalInput);
                    setNewEventSummary(parsed.summary);
                    setNewEventDate(parsed.date);
                    setNewEventTime(parsed.time);
                    setNewEventEndTime(parsed.endTime);
                    setSaveMessage('Parsed. Review the fields below, then create.');
                  }}
                >
                  Parse request
                </button>
                <input
                  style={styles.input}
                  value={newEventSummary}
                  onChange={(e) => setNewEventSummary(e.target.value)}
                  placeholder="Event title"
                />
                <input
                  style={styles.input}
                  type="date"
                  value={newEventDate}
                  onChange={(e) => setNewEventDate(e.target.value)}
                />
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  <input
                    style={styles.input}
                    type="time"
                    value={newEventTime}
                    onChange={(e) => setNewEventTime(e.target.value)}
                  />
                  <input
                    style={styles.input}
                    type="time"
                    value={newEventEndTime}
                    onChange={(e) => setNewEventEndTime(e.target.value)}
                  />
                </div>
                <button
                  style={styles.actionButton}
                  disabled={saving}
                  onClick={async () => {
                    try {
                      setSaving(true);
                      setSaveMessage('');
                      const res = await fetch('/api/calendar', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          summary: newEventSummary,
                          date: newEventDate,
                          time: newEventTime,
                          endTime: newEventEndTime,
                        }),
                      });
                      const data = await res.json();
                      if (!res.ok) throw new Error(data?.error || 'Failed to create event');
                      setSaveMessage('Event created.');
                      const refresh = await fetch('/api/calendar');
                      const refreshed = await refresh.json();
                      setEvents(Array.isArray(refreshed?.events) ? refreshed.events : []);
                    } catch (e) {
                      setSaveMessage(e instanceof Error ? e.message : 'Failed to create event');
                    } finally {
                      setSaving(false);
                    }
                  }}
                >
                  {saving ? 'Saving…' : 'Create event'}
                </button>
                {saveMessage ? <p style={styles.saveMessage}>{saveMessage}</p> : null}
              </div>
            )}

            {!error && (
              <>
                <h3 style={styles.popupSection}>Today</h3>
                <ul style={styles.list}>
                  {today.length ? today.map((event, idx) => (
                    <li key={`today-${idx}`}>
                      <div style={styles.eventDate}>{formatEventDate(event)}</div>
                      <div style={styles.eventTitle}>{event.summary || '(untitled event)'}</div>
                    </li>
                  )) : <li>No events loaded yet</li>}
                </ul>

                <h3 style={styles.popupSection}>Next 3 days</h3>
                <ul style={styles.list}>
                  {nextThreeDays.length ? nextThreeDays.map((event, idx) => (
                    <li key={`next-${idx}`}>
                      <div style={styles.eventDate}>{formatEventDate(event)}</div>
                      <div style={styles.eventTitle}>{event.summary || '(untitled event)'}</div>
                    </li>
                  )) : <li>No more events loaded yet</li>}
                </ul>
              </>
            )}
          </aside>
        )}
      </section>
    </main>
  );
}

function formatEventDate(event: any) {
  const raw = event?.start?.dateTime || event?.start?.date;
  if (!raw) return 'Unknown date';
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return String(raw);
  return d.toLocaleString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

const spritePixel = {
  width: 8,
  height: 8,
  boxSizing: 'border-box' as const,
  border: '1px solid rgba(0,0,0,0.15)',
};

const styles: { [key: string]: React.CSSProperties } = {
  main: {
    minHeight: '100vh',
    background: 'linear-gradient(#1e293b 0%, #0f172a 55%, #020617 100%)',
    color: 'white',
    padding: '24px',
    fontFamily: 'monospace',
  },
  topbar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px',
    gap: '16px',
    flexWrap: 'wrap',
  },
  kicker: {
    margin: 0,
    color: '#67e8f9',
    textTransform: 'uppercase',
    letterSpacing: '0.2em',
    fontSize: '12px',
  },
  title: {
    margin: '6px 0 0',
    fontSize: '28px',
    fontWeight: 800,
  },
  statusPill: {
    padding: '10px 14px',
    borderRadius: '999px',
    background: 'rgba(34,197,94,0.15)',
    border: '1px solid rgba(34,197,94,0.3)',
    color: '#86efac',
    fontSize: '12px',
  },
  office: {
    position: 'relative',
    maxWidth: '1200px',
    height: '760px',
    margin: '0 auto',
    border: '4px solid #334155',
    borderRadius: '18px',
    overflow: 'hidden',
    background: 'linear-gradient(#334155 0 16%, #1f2937 16% 72%, #111827 72% 100%)',
    boxShadow: '0 30px 80px rgba(0,0,0,0.35)',
  },
  wall: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: '16%',
    height: '18%',
    background: '#475569',
    borderTop: '4px solid #64748b',
    borderBottom: '4px solid #0f172a',
    backgroundImage:
      'linear-gradient(90deg, rgba(255,255,255,0.08) 0 2px, transparent 2px 40px), linear-gradient(rgba(255,255,255,0.08) 0 2px, transparent 2px 40px)',
    backgroundSize: '40px 40px',
  },
  chris: {
    position: 'absolute',
    left: '28px',
    top: '24px',
    width: '120px',
    textAlign: 'center',
  },
  chronos: {
    position: 'absolute',
    left: '46%',
    top: '48%',
    width: '120px',
    textAlign: 'center',
  },
  chronosDesk: {
    position: 'absolute',
    left: '42%',
    top: '44%',
    width: '220px',
    height: '92px',
    background: '#8b5e34',
    border: '4px solid #5b3a1d',
    borderRadius: '6px',
    boxShadow: '0 10px 20px rgba(0,0,0,0.25)',
  },
  researcher: {
    position: 'absolute',
    left: '64%',
    top: '48%',
    width: '120px',
    textAlign: 'center',
  },
  researcherDesk: {
    position: 'absolute',
    left: '60%',
    top: '44%',
    width: '220px',
    height: '92px',
    background: '#6b4c34',
    border: '4px solid #4a3a1d',
    borderRadius: '6px',
    boxShadow: '0 10px 20px rgba(0,0,0,0.25)',
  },
  spriteHeadChris: {
    ...spritePixel,
    width: 40,
    height: 40,
    margin: '0 auto',
    background: '#8b5cf6',
    borderRadius: '6px',
    boxShadow: 'inset -6px -6px 0 rgba(0,0,0,0.15)',
  },
  spriteBodyChris: {
    ...spritePixel,
    width: 48,
    height: 34,
    margin: '-4px auto 0',
    background: '#a78bfa',
    borderRadius: '6px 6px 10px 10px',
  },
  spriteHeadChronos: {
    ...spritePixel,
    width: 40,
    height: 40,
    margin: '0 auto',
    background: '#22c55e',
    borderRadius: '6px',
    boxShadow: 'inset -6px -6px 0 rgba(0,0,0,0.15)',
  },
  spriteBodyChronos: {
    ...spritePixel,
    width: 48,
    height: 34,
    margin: '-4px auto 0',
    background: '#4ade80',
    borderRadius: '6px 6px 10px 10px',
  },
  spriteHeadResearcher: {
    ...spritePixel,
    width: 40,
    height: 40,
    margin: '0 auto',
    background: '#f59e0b',
    borderRadius: '6px',
    boxShadow: 'inset -6px -6px 0 rgba(0,0,0,0.15)',
  },
  spriteBodyResearcher: {
    ...spritePixel,
    width: 48,
    height: 34,
    margin: '-4px auto 0',
    background: '#fbbf24',
    borderRadius: '6px 6px 10px 10px',
  },
  nameTag: {
    marginTop: '8px',
    fontSize: '12px',
    fontWeight: 700,
    color: '#e2e8f0',
  },
  roleTag: {
    marginTop: '2px',
    fontSize: '10px',
    color: '#94a3b8',
  },
  bubble: {
    position: 'absolute',
    left: '51%',
    top: '39%',
    transform: 'translateX(-50%)',
    padding: '8px 12px',
    background: '#f8fafc',
    color: '#0f172a',
    border: '4px solid #cbd5e1',
    borderRadius: '10px',
    fontSize: '12px',
    boxShadow: '0 12px 20px rgba(0,0,0,0.2)',
  },
  panel: {
    position: 'absolute',
    right: '22px',
    top: '22px',
    width: '320px',
    padding: '18px',
    background: 'rgba(15, 23, 42, 0.9)',
    border: '4px solid #334155',
    borderRadius: '16px',
    boxShadow: '0 18px 36px rgba(0,0,0,0.3)',
  },
  panelTitle: {
    margin: '0 0 10px',
    fontSize: '16px',
    color: '#67e8f9',
  },
  list: {
    margin: '0 0 18px',
    paddingLeft: '20px',
    lineHeight: 1.8,
    color: '#e2e8f0',
  },
  errorText: {
    color: '#fca5a5',
    margin: '0 0 18px',
    lineHeight: 1.6,
  },
  formBox: {
    marginBottom: '14px',
    padding: '12px',
    border: '2px solid #334155',
    borderRadius: '12px',
    background: 'rgba(2, 6, 23, 0.6)',
  },
  input: {
    width: '100%',
    marginBottom: '8px',
    padding: '10px 12px',
    borderRadius: '10px',
    border: '2px solid #334155',
    background: '#0f172a',
    color: '#e2e8f0',
    fontFamily: 'monospace',
  },
  textarea: {
    width: '100%',
    marginBottom: '8px',
    padding: '10px 12px',
    borderRadius: '10px',
    border: '2px solid #334155',
    background: '#0f172a',
    color: '#e2e8f0',
    fontFamily: 'monospace',
    resize: 'vertical',
  },
  secondaryButton: {
    width: '100%',
    marginBottom: '8px',
    padding: '10px 12px',
    borderRadius: '10px',
    border: '2px solid #67e8f9',
    background: '#082f49',
    color: '#e0f2fe',
    fontFamily: 'monospace',
    cursor: 'pointer',
  },
  saveMessage: {
    margin: '10px 0 0',
    color: '#86efac',
    fontSize: '12px',
  },
  popup: {
    position: 'absolute',
    right: '22px',
    top: '160px',
    width: '360px',
    padding: '18px',
    background: 'rgba(15, 23, 42, 0.96)',
    border: '4px solid #334155',
    borderRadius: '16px',
    boxShadow: '0 18px 36px rgba(0,0,0,0.3)',
    zIndex: 20,
  },
  closeButton: {
    position: 'absolute',
    top: '8px',
    right: '10px',
    width: '28px',
    height: '28px',
    borderRadius: '999px',
    border: '2px solid #64748b',
    background: '#0f172a',
    color: '#e2e8f0',
    fontSize: '18px',
    lineHeight: '20px',
    cursor: 'pointer',
  },
  plusButton: {
    position: 'absolute',
    top: '8px',
    right: '46px',
    width: '28px',
    height: '28px',
    borderRadius: '999px',
    border: '2px solid #67e8f9',
    background: '#082f49',
    color: '#e0f2fe',
    fontSize: '18px',
    lineHeight: '20px',
    cursor: 'pointer',
  },
  popupSub: {
    margin: '0 0 12px',
    color: '#cbd5e1',
    fontSize: '12px',
  },
  popupSection: {
    margin: '10px 0 6px',
    color: '#67e8f9',
    fontSize: '13px',
  },
  eventDate: {
    color: '#94a3b8',
    fontSize: '11px',
    lineHeight: 1.4,
  },
  eventTitle: {
    color: '#e2e8f0',
    fontSize: '13px',
    lineHeight: 1.4,
    marginBottom: '8px',
  },
};
