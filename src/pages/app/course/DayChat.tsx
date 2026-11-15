/* One day of the course as a short chat with a coach. The coach explains the day's idea in small bubbles; the
   person answers with quick-reply chips that branch a little ("Why does that matter?", "What if they keep going?");
   the practice happens inside the chat (pick the reply you'd send, then optionally write your own and get a verdict
   in words); then "try it today", picked for where the next jab is most likely, and "Day N done".
   The script is built here from static lesson content (server/course-content.ts). No numbers are ever shown. */
import {useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode} from 'react';
import {Icon, type IconId} from '../../../components/Icon';
import {api, track} from '../../../lib/api';
import {useMe} from '../../../lib/me';
import {orderFor} from '../plan/Session';
import type {DoneRes, LessonPack, LessonText} from './types';

/** The coach's avatar: the gradient circle with a plain speech bubble. */
const Coach = () => (
  <span className="cs-av" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M5 6.5A2.5 2.5 0 0 1 7.5 4h9A2.5 2.5 0 0 1 19 6.5v6a2.5 2.5 0 0 1-2.5 2.5H11l-3.6 3v-3h0A2.4 2.4 0 0 1 5 12.5z" fill="#fff" /></svg></span>
);

type Msg = {id: number; who: 'coach' | 'me'; node: ReactNode};
type Chip = {label: string; go: () => void};
type Prompt = {k: 'chips'; chips: Chip[]; primary?: boolean} | {k: 'pick'; q: number} | {k: 'write'} | {k: 'topic'};
type Pick = {id: string; picked: number; good: boolean};

const reduced = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
const wait = (ms: number) => new Promise((r) => setTimeout(r, reduced() ? 0 : ms));
const plain = (s: string) => s.replace(/\*/g, '');
const lower = (s: string) => s.charAt(0).toLowerCase() + s.slice(1);

const TOPICS: {id: string; label: string; icon: IconId; word: string}[] = [
  {id: 'schedule', label: 'Schedule or pickup', icon: 'tr-schedule', word: 'the next pickup or schedule message'},
  {id: 'money', label: 'Money for the kids', icon: 'tr-money', word: 'the next money message'},
  {id: 'school', label: 'School or health', icon: 'tr-school', word: 'the next school or health message'},
  {id: 'partner', label: 'A new partner', icon: 'tr-partner', word: 'the next remark about a partner'},
  {id: 'other', label: 'Something else', icon: 'chat', word: 'the next tense message'},
];
const HEADLINE = (c: number, t: number) => (c >= t ? 'Calm all the way.' : c === t - 1 ? 'Mostly calm.' : c === t - 2 ? 'Getting there.' : 'A tricky set.');
const READ = (c: number, t: number) => (c >= t - 1 ? 'A judge would read your picks well.' : c === t - 2 ? 'A judge might read a couple of these badly.' : 'A judge would read most of these badly. That is what practice is for.');
const VERDICT: Record<string, {t: string; tone: string}> = {
  good: {t: 'A judge would read this well', tone: 'ok'}, risky: {t: 'A judge might read this badly', tone: 'amber'}, bad: {t: 'A judge would read this badly', tone: 'warn'},
};

/** Their texts inside a coach bubble; jabs struck through and the ask outlined once the coach has explained. */
function Texts({l, marked = false}: {l: LessonText; marked?: boolean}) {
  return (
    <div className="cs-texts">
      {l.from && <small className="cs-from">{l.from}</small>}
      {l.mine && <p className="cs-mine">{l.mine}<small>You · 2 days ago · read</small></p>}
      {l.them.map((b, i) => (
        <p key={i} className={'cs-them' + (marked && l.jab?.includes(i) ? ' jab' : '') + (marked && l.ask === i ? ' ask' : '')}>{b}</p>
      ))}
    </div>
  );
}

export function DayChat({pack, onExit, onDone}: {pack: LessonPack; onExit: () => void; onDone: () => void}) {
  const {me} = useMe();
  const l = pack.lesson;
  const qs = pack.session.questions;
  const [log, setLog] = useState<Msg[]>([]);
  const [typing, setTyping] = useState(false);
  const [prompt, setPrompt] = useState<Prompt | null>(null);
  const [stage, setStage] = useState<'lesson' | 'practice' | 'try'>(l ? 'lesson' : 'practice');
  const [qi, setQi] = useState(0);
  const [done, setDone] = useState<DoneRes | null>(null);
  const [err, setErr] = useState('');
  const picks = useRef<Pick[]>([]);
  const topic = useRef<string | undefined>(undefined);
  const seq = useRef(0);
  const alive = useRef(true);
  const started = useRef(false);
  const end = useRef<HTMLDivElement>(null);

  const push = (who: Msg['who'], node: ReactNode) => setLog((x) => [...x, {id: ++seq.current, who, node}]);
  const say = useCallback(async (...items: ReactNode[]) => {
    setPrompt(null);
    for (const it of items) {
      setTyping(true);
      await wait(480);
      if (!alive.current) return;
      setTyping(false);
      push('coach', it);
    }
  }, []);
  const chips = (cs: Chip[], primary = false) => setPrompt({k: 'chips', chips: cs, primary});
  const answer = (label: string, then: () => void) => () => { push('me', label); void then(); };

  useEffect(() => () => { alive.current = false; }, []);
  useLayoutEffect(() => { end.current?.scrollIntoView({block: 'end', behavior: reduced() ? 'auto' : 'smooth'}); }, [log, typing, prompt]);

  /* ---------------- the script ---------------- */
  async function start() {
    if (pack.checkIn) {
      await say(<>Before today: your last task was <b>“{pack.checkIn.task}”</b> Did you get to try it for real?</>);
      const id = pack.checkIn.id;
      chips([
        {label: 'Yes, I did', go: answer('Yes, I did', async () => { void api('/api/course/checkin', {body: {id, tried: true}}).catch(() => {}); await say('Nice. That goes on your calendar for the week.'); await intro(); })},
        {label: 'Not yet', go: answer('Not yet', async () => { void api('/api/course/checkin', {body: {id, tried: false}}).catch(() => {}); await say("That's fine. The chance will come. Let's do today."); await intro(); })},
      ]);
      return;
    }
    await intro();
  }

  async function intro() {
    if (!l && pack.chat?.length) {
      // A written practice day (29+): its own short chat, then the texts.
      await say(...pack.chat);
      chips([{label: "Let's practise", go: answer("Let's practise", practice)}], true);
      return;
    }
    if (!l) {
      const t = pack.topics?.length ? `, mostly about ${pack.topics.slice(0, 2).join(' and ')}` : '';
      await say(<><b>Daily practice.</b> Five texts like the ones in your {pack.from === 'record' ? 'record' : 'situation'}{t}.</>, 'Same habits as the course: pause, find the ask, keep it short.');
      chips([{label: "Let's go", go: answer("Let's go", practice)}], true);
      return;
    }
    await say(plain(l.hook), <>Here's a real kind of text. {l.q}<Texts l={l} /></>);
    chips([
      {label: 'Show me the calm way', go: answer('Show me the calm way', () => calmWay(false))},
      {label: 'Why does that matter?', go: answer('Why does that matter?', async () => {
        await say(l.why);
        chips([{label: 'Got it, show me', go: answer('Got it, show me', () => calmWay(true))}]);
      })},
    ]);
  }

  async function calmWay(whyShown: boolean) {
    if (!l) return;
    const jabs = (l.jab ?? []).map((i) => `“${l.them[i]}”`);
    const parts: ReactNode[] = [];
    if (jabs.length || l.ask !== undefined) {
      parts.push(<>
        {jabs.length ? <>{jabs.join(' and ')} {jabs.length > 1 ? 'are jabs' : 'is a jab'}: there to pull you into an argument. </> : null}
        {l.ask !== undefined ? 'The part that needs an answer is outlined.' : 'Nothing here asks you anything.'}
        <Texts l={l} marked />
      </>);
    }
    if (l.bad) parts.push(<>The reply that feels right in the moment:<p className="cs-bad">{l.bad}</p></>);
    parts.push(l.calm
      ? <>{plain(l.calmHead)}<p className="cs-calm">{l.calm}</p></>
      : <>{plain(l.calmHead)} Here the calm way is no reply at all.</>);
    if (!whyShown) parts.push(l.why);
    await say(...parts);
    chips([
      {label: 'Makes sense', go: answer('Makes sense', idea)},
      {label: 'What if they keep going?', go: answer('What if they keep going?', async () => {
        await say('Then you do the same thing again: answer the next real question, skip the next jab. Each calm reply gives them less to push on.');
        chips([{label: 'Got it', go: answer('Got it', idea)}]);
      })},
    ]);
  }

  async function idea() {
    if (!l) return;
    await say(<>The one thing to keep:<b className="cs-idea">{l.idea}</b></>);
    chips([{label: 'Got it, let me try', go: answer('Got it, let me try', practice)}], true);
  }

  async function practice() {
    setStage('practice');
    await say(`Your turn. ${qs.length} texts. Pick the one you'd send.`);
    await ask(0);
  }

  async function ask(i: number) {
    setQi(i);
    await say(<>{i === 0 ? 'Which would you send?' : 'Next one.'}<div className="cs-texts">{qs[i].them.map((b, k) => <p key={k} className="cs-them">{b}</p>)}</div></>);
    setPrompt({k: 'pick', q: i});
  }

  async function chose(i: number, k: number) {
    const q = qs[i], o = q.options[k];
    picks.current = [...picks.current, {id: q.id, picked: k, good: o.good}];
    push('me', <span className={'cs-picked ' + (o.good ? 'ok' : 'bad')}>{o.text}<em>{o.good ? '✓ ' : ''}{o.tag}</em></span>);
    track('course_pick', {ref: pack.ref, q: i + 1, good: o.good});
    const good = q.options.find((x) => x.good)!;
    await say(o.good ? `Nice. ${o.tag}.` : <>That one: {lower(o.tag)}. The calm one was <b>“{good.text}”</b> ({lower(good.tag)}).</>);
    if (i + 1 < qs.length) { chips([{label: 'Next message', go: () => void ask(i + 1)}], true); return; }
    const c = picks.current.filter((x) => x.good).length;
    await say(<><b>{HEADLINE(c, qs.length)}</b> {READ(c, qs.length)}</>);
    if (!l && pack.tryToday) {
      await say(<>One thing to try today: <b>{pack.tryToday}</b> I'll check in tomorrow.</>);
    }
    if (!l) { chips([{label: 'Finish', go: () => void finish()}], true); return; }
    chips([
      {label: 'Next: try it today', go: answer('Next: try it today', tryIt)},
      {label: 'Write my own too', go: answer('Write my own too', async () => {
        await say(<>Write how you'd answer this one. You'll get a verdict in words.<Texts l={l} /></>);
        setPrompt({k: 'write'});
      })},
    ]);
  }

  async function wrote(draft: string) {
    push('me', <span className="cs-picked">{draft}</span>);
    setPrompt(null); setTyping(true);
    try {
      const r = await api<{verdict: string; flags: {phrase: string; why: string; fix?: string}[]; better: string}>('/api/course/write', {body: {ref: pack.ref, draft}});
      setTyping(false);
      const v = VERDICT[r.verdict] ?? VERDICT.risky;
      await say(<>
        <b className={`cs-verdict ${v.tone}`}><i />{v.t}</b>
        {r.flags.map((f) => <span key={f.phrase} className="cs-flag">“{f.phrase}”: {f.why}{f.fix ? ` ${f.fix}` : ''}</span>)}
        {r.better && r.verdict !== 'good' && <>A calmer way:<p className="cs-calm">{r.better}</p></>}
      </>);
    } catch (e) {
      setTyping(false);
      await say((e as Error).message);
    }
    chips([{label: 'Next: try it today', go: answer('Next: try it today', tryIt)}], true);
  }

  async function tryIt() {
    setStage('try');
    await say('Last step. Where are you most likely to get a jab this week?');
    setPrompt({k: 'topic'});
  }

  async function topicPicked(t: (typeof TOPICS)[number]) {
    if (!l) return;
    topic.current = t.id;
    push('me', t.label);
    await say(<>Then that's your task. For {t.word}: <b>{lower(l.try)}</b> I'll check in tomorrow.</>);
    chips([{label: `Finish ${pack.kind === 'day' ? pack.label : 'today'}`, go: () => void finish()}], true);
  }

  async function finish() {
    setPrompt(null); setErr('');
    try {
      const r = await api<DoneRes>('/api/course/done', {body: {ref: pack.ref, answers: picks.current.map(({id, picked}) => ({id, picked})), topic: topic.current}});
      setDone(r);
      window.scrollTo({top: 0});
    } catch (e) {
      setErr((e as Error).message);
      chips([{label: 'Try again', go: () => void finish()}], true);
    }
  }

  useEffect(() => { if (!started.current) { started.current = true; void start(); } }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (done) return <DayDone pack={pack} res={done} tz={me?.tz} onDone={onDone} />;

  const sub = stage === 'lesson' ? '1 min' : stage === 'practice' ? `Practice · ${Math.min(qi + 1, qs.length)} of ${qs.length}` : 'Try it today';
  const q = prompt?.k === 'pick' ? qs[prompt.q] : null;
  return (
    <section className="cs fade-in" aria-label={`${pack.label} lesson`}>
      <header className="cs-top">
        <button className="pl-x" onClick={onExit} aria-label="Leave the lesson">
          <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" /></svg>
        </button>
        <div><b>{pack.label} · {pack.title}</b><small>{sub}</small></div>
      </header>
      <div className="cs-log" role="log" aria-live="polite">
        {log.map((m) => (
          <div key={m.id} className={`cs-row ${m.who}`}>
            {m.who === 'coach' && <Coach />}
            <div className="cs-b">{m.node}</div>
          </div>
        ))}
        {typing && <div className="cs-row coach"><Coach /><div className="cs-b cs-typing"><i /><i /><i /></div></div>}
      </div>
      <div className="cs-prompt">
        {prompt?.k === 'chips' && (
          <div className={'cs-chips' + (prompt.primary ? ' one' : '')}>
            {prompt.chips.map((c) => <button key={c.label} className={prompt.primary && prompt.chips.length === 1 ? 'btn btn-primary btn-lg btn-block' : 'cs-chip'} onClick={c.go}>{c.label}</button>)}
          </div>
        )}
        {q && prompt?.k === 'pick' && (
          <div className="cs-opts" role="group" aria-label="Three replies">
            {orderFor(q.id, q.options.length).map((k) => (
              <button key={k} className="cs-opt" onClick={() => { setPrompt(null); void chose(prompt.q, k); }}>{q.options[k].text}</button>
            ))}
          </div>
        )}
        {prompt?.k === 'write' && <WriteBox onSend={(d) => void wrote(d)} onSkip={() => { push('me', 'Skip it'); void tryIt(); }} />}
        {prompt?.k === 'topic' && (
          <div className="cs-topics" role="radiogroup" aria-label="Where a jab is most likely">
            {TOPICS.map((t) => <button key={t.id} role="radio" aria-checked="false" className="cs-topic" onClick={() => void topicPicked(t)}><Icon id={t.icon} size={32} />{t.label}</button>)}
          </div>
        )}
        {err && <p className="pl-err">{err}</p>}
      </div>
      <div ref={end} className="cs-end" />
    </section>
  );
}

function WriteBox({onSend, onSkip}: {onSend: (d: string) => void; onSkip: () => void}) {
  const [v, setV] = useState('');
  return (
    <form className="cs-write" onSubmit={(e) => { e.preventDefault(); if (v.trim().length >= 3) onSend(v.trim()); }}>
      <textarea className="field" rows={3} maxLength={800} autoFocus placeholder="Type it the way you'd text it" value={v} onChange={(e) => setV(e.target.value)} />
      <div className="cs-write-b">
        <button type="button" className="btn btn-quiet" onClick={onSkip}>Skip it</button>
        <button className="btn btn-primary" disabled={v.trim().length < 3}>Check my reply</button>
      </div>
    </form>
  );
}

const WD = (iso: string, tz?: string) => new Date(iso).toLocaleDateString('en-US', {weekday: 'short', timeZone: tz});

/** "Day N done": the skill it added, the streak, this week's days, and the task. */
function DayDone({pack, res, tz, onDone}: {pack: LessonPack; res: DoneRes; tz?: string; onDone: () => void}) {
  const l = pack.lesson;
  useEffect(() => { track('course_day_done', {ref: pack.ref}); }, [pack.ref]);
  return (
    <section className="cs-done fade-in" aria-label="Done">
      <span className="cs-done-ico"><Icon id={pack.kind === 'daily' ? 'target' : 'party'} size={76} /></span>
      <small className="cs-kick">{pack.kind === 'day' ? 'New skill' : pack.kind === 'mod' ? pack.label : 'Daily practice'}</small>
      <h1>{pack.kind === 'daily' ? 'Practice done' : pack.you ?? `${pack.label} done`}</h1>
      <div className="card cs-week">
        <div className="cs-week-h"><b>This week</b><span className="chip chip-ok"><Icon id="flame" size={18} />{res.streak.days} day{res.streak.days === 1 ? '' : 's'}</span></div>
        <ol className="cs-strip">
          {res.streak.last7.map((d) => (
            <li key={d.day} className={(d.calm ? 'calm' : '') + (d.today ? ' today' : '')}>
              <i>{d.calm ? <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" /></svg> : d.day}</i>
              <span>{WD(d.at, tz)}</span>
            </li>
          ))}
        </ol>
      </div>
      {l && (
        <div className="card cs-learned">
          <small>What you learned</small>
          {l.learned.map((x) => <p key={x}><i aria-hidden="true" />{x}</p>)}
        </div>
      )}
      {l && (
        <div className="card cs-task"><Icon id="target" size={40} /><span><small>Try it today</small><b>{l.try}</b></span></div>
      )}
      <button className="btn btn-primary btn-lg btn-block" onClick={onDone}>Done for today</button>
      {pack.kind === 'day' && <a className="cs-remind" href={`/api/plan/ics?time=19:00`} download="parley-daily-reminder.ics">Remind me tomorrow at 7pm</a>}
    </section>
  );
}
