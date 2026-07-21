"use client";

import React, { useState, useRef, useEffect, useCallback } from 'react';
import KordexBackground from '@/components/KordexBackground';
import { SYS, fmt, readFileText, extractPDFText, THINK_CYCLE } from '@/src/lib/kordex-config';

interface Msg { role: 'user' | 'agent'; html: string; tools?: string[]; attachments?: string[] }

const BoltSvg = ({ size = 16 }: { size?: number }) => (
  <svg viewBox="0 0 18 18" fill="none" style={{ width: size, height: size }}>
    <path d="M10.5 1L4 10h5L7 17L14 8H9L10.5 1Z" fill="#F97316" stroke="#F97316" strokeWidth=".5" strokeLinejoin="round" />
  </svg>
);

export default function Page() {
  const [screen, setScreen] = useState<'home' | 'chat'>('home');
  const [model, setModel] = useState('llama-3.3-70b-versatile');
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [busy, setBusy] = useState(false);
  const [sbOpen, setSbOpen] = useState(false);
  const [status, setStatus] = useState<{ label: string; cls: string }>({ label: 'Ready', cls: 'sp-ready' });
  const [homeFiles, setHomeFiles] = useState<File[]>([]);
  const [chatFiles, setChatFiles] = useState<File[]>([]);
  const [thinking, setThinking] = useState(false);
  const [thinkIdx, setThinkIdx] = useState(0);
  const [showScroll, setShowScroll] = useState(false);

  const histRef = useRef<any[]>([]);
  const chatMsgsRef = useRef<HTMLDivElement>(null);
  const homeInpRef = useRef<HTMLTextAreaElement>(null);
  const chatInpRef = useRef<HTMLTextAreaElement>(null);
  const homeFileRef = useRef<HTMLInputElement>(null);
  const chatFileRef = useRef<HTMLInputElement>(null);
  const thinkTimer = useRef<any>(null);
  const sbCloseTimer = useRef<any>(null);

  // Think cycle
  useEffect(() => {
    if (thinking) {
      thinkTimer.current = setInterval(() => setThinkIdx(i => (i + 1) % THINK_CYCLE.length), 1800);
      return () => clearInterval(thinkTimer.current);
    }
  }, [thinking]);

  const scrollBottom = useCallback(() => {
    if (chatMsgsRef.current) chatMsgsRef.current.scrollTop = 999999;
  }, []);

  useEffect(() => { scrollBottom(); }, [msgs, thinking, scrollBottom]);

  const checkScroll = () => {
    const c = chatMsgsRef.current;
    if (c) setShowScroll(c.scrollHeight - c.scrollTop - c.clientHeight > 100);
  };

  // Sidebar
  const openSidebar = () => { clearTimeout(sbCloseTimer.current); setSbOpen(true); };
  const closeSidebar = () => { sbCloseTimer.current = setTimeout(() => setSbOpen(false), 100); };
  const toggleSidebar = () => sbOpen ? closeSidebar() : openSidebar();

  // Textarea auto-resize
  const autoResize = (el: HTMLTextAreaElement, max: number) => { el.style.height = 'auto'; el.style.height = Math.min(el.scrollHeight, max) + 'px'; };

  // File handlers
  const handleHomeFiles = (input: HTMLInputElement) => {
    if (input.files) { setHomeFiles(f => [...f, ...Array.from(input.files!)]); input.value = ''; }
  };
  const handleChatFiles = (input: HTMLInputElement) => {
    if (input.files) { setChatFiles(f => [...f, ...Array.from(input.files!)]); input.value = ''; }
  };

  // Core send logic
  const sendWithContent = async (txt: string, files: File[]) => {
    setBusy(true);
    setStatus({ label: 'Working…', cls: 'sp-busy' });

    const fileNames: string[] = [];
    const fileResults: any[] = [];
    for (const f of files) {
      const content = await readFileText(f);
      fileNames.push(f.name);
      fileResults.push(content);
    }

    const contentParts: any[] = [];
    let textPart = txt || '';
    for (const fr of fileResults) {
      if (fr.type === 'image') {
        contentParts.push({ type: 'image_url', image_url: { url: fr.data } });
        textPart += (textPart ? '\n' : '') + `[Attached image: ${fr.name}]`;
      } else if (fr.type === 'pdf') {
        try {
          const pdfText = await extractPDFText(fr.data);
          textPart += `\n\n--- PDF: ${fr.name} ---\n${pdfText}`;
        } catch { textPart += `\n\n--- PDF: ${fr.name} ---\n[Could not extract text]`; }
      } else {
        textPart += `\n\n--- File: ${fr.name} ---\n${fr.data}`;
      }
    }
    if (!textPart && fileNames.length) textPart = `Analyze these files: ${fileNames.join(', ')}`;
    if (textPart) contentParts.unshift({ type: 'text', text: textPart });

    const displayMsg = txt || (files.length ? `Attached ${files.length} file(s)` : '');
    setMsgs(m => [...m, { role: 'user', html: fmt(displayMsg || '📎 Files attached'), attachments: fileNames }]);

    const hasImagesOrPDF = fileResults.some((fr: any) => fr.type === 'image' || fr.type === 'pdf');

    // Auto-switch models based on attachments
    // Use local var because setModel is async and won't update `model` in time for fetch
    let activeModel = model;
    if (hasImagesOrPDF) {
      activeModel = 'meta-llama/llama-4-scout-17b-16e-instruct';
      setModel(activeModel);
    }

    const userContent = hasImagesOrPDF ? contentParts : (textPart || `Analyze these files: ${fileNames.join(', ')}`);
    histRef.current.push({ role: 'user', content: userContent });

    setThinking(true);
    setThinkIdx(0);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: activeModel, max_tokens: 4096, temperature: 0.3, messages: [{ role: 'system', content: SYS }, ...histRef.current] })
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error.message);
      const reply = data.choices[0].message.content;
      histRef.current.push({ role: 'assistant', content: reply });
      setThinking(false);
      const tools: string[] = [];
      if (reply.includes('```')) tools.push('Code');
      if (/debug|fix|error|bug/i.test(reply) && !reply.includes('```')) tools.push('Debugging');
      if (/refactor|improve|optimize/i.test(reply) && !reply.includes('```')) tools.push('Optimization');
      setMsgs(m => [...m, { role: 'agent', html: fmt(reply), tools }]);
      setStatus({ label: 'Ready', cls: 'sp-ready' });
    } catch (err: any) {
      setThinking(false);
      setMsgs(m => [...m, { role: 'agent', html: fmt(`Something went wrong: ${err.message}\n\nIf you're using vision features, try switching to Llama Scout for image support.`) }]);
      setStatus({ label: 'Error', cls: 'sp-err' });
    }
    setBusy(false);
  };

  const homeSubmit = async () => {
    const t = homeInpRef.current?.value.trim() || '';
    const files = [...homeFiles];
    setHomeFiles([]);
    if (homeInpRef.current) homeInpRef.current.value = '';
    if (!t && !files.length) return;
    setScreen('chat');
    await sendWithContent(t, files);
  };

  const startChat = (txt: string) => { setScreen('chat'); sendWithContent(txt, []); };

  const sendMsg = async () => {
    const inp = chatInpRef.current;
    const txt = inp?.value.trim() || '';
    const files = [...chatFiles];
    if ((!txt && !files.length) || busy) return;
    if (inp) { inp.value = ''; inp.style.height = 'auto'; }
    setChatFiles([]);
    await sendWithContent(txt, files);
  };

  const goHome = () => { setScreen('home'); setMsgs([]); histRef.current = []; setChatFiles([]); };
  const clearChat = () => { if (!confirm('Clear conversation?')) return; setMsgs([]); histRef.current = []; setChatFiles([]); };
  const sp = (t: string) => { if (chatInpRef.current) { chatInpRef.current.value = t; chatInpRef.current.focus(); autoResize(chatInpRef.current, 130); } };

  const isLlama = model === 'llama-3.3-70b-versatile';

  return (
    <>
      <KordexBackground />

      {/* Sidebar trigger */}
      <div className="sb-trigger" onMouseEnter={openSidebar} />

      {/* SIDEBAR */}
      <aside className={`sidebar ${sbOpen ? 'open' : ''}`} onMouseEnter={() => clearTimeout(sbCloseTimer.current)} onMouseLeave={closeSidebar}>
        <div className="sb-head">
          <div className="sb-logo"><BoltSvg size={17} /></div>
          <div className="sb-brand">KORDEX <em>AI</em></div>
          <div className="sb-x" onClick={closeSidebar}>✕</div>
        </div>
        <div className="agent-identity">
          <div className="agent-header">
            <div className="agent-av"><BoltSvg size={20} /></div>
            <div className="agent-info">
              <div className="agent-name">KORDEX AI</div>
              <div className="agent-handle">@kordexai · v1.0</div>
            </div>
          </div>
          <div className="agent-pills">
            <span className="apill apill-g">Online</span>
            <span className="apill apill-p">Groq · Dual Model</span>
          </div>
        </div>
        <div className="cr-section">
          <div className="cr-label">Creator</div>
          <div className="cr-row">
            <div className="cr-av">BT</div>
            <div className="cr-info">
              <div className="cr-name">Bharath Thommandru</div>
              <div className="cr-role">Developer &amp; Builder</div>
            </div>
          </div>
          <a href="https://mail.google.com/mail/?view=cm&fs=1&to=bharathtommandru1@gmail.com" target="_blank" rel="noopener noreferrer" className="cr-email-btn">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="16" x="2" y="4" rx="2" /><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" /></svg>
            Email Bharath
          </a>
        </div>
        <div className="sb-body">
          <div className="sb-lbl">Settings</div>
          <details className="inst-details">
            <summary className="inst-summary">
              <div className="inst-sum-left"><span className="inst-live">LIVE</span> Active Instructions</div>
              <svg className="inst-chevron" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6" /></svg>
            </summary>
            <div className="inst-box">Senior software engineering assistant. Specializes in programming, debugging, architecture, and technical problem-solving. Professional, direct, and precise.</div>
          </details>
        </div>
        <div className="sb-foot">Powered by <strong>Groq AI</strong></div>
      </aside>

      <div className={`overlay ${sbOpen ? 'open' : ''}`} onClick={closeSidebar} />

      {/* APP */}
      <div className="app">
        {/* HOME SCREEN */}
        {screen === 'home' && (
          <div className="home" id="homeScreen">
            <div className="home-menu" onClick={toggleSidebar}>☰</div>
            <div className="home-text">
              <h1 className="home-title">KORDEX AI</h1>
              <p className="home-sub">Write, debug, and refactor code with a senior engineer.</p>
            </div>
            <div className="home-input-wrap">
              <div className={`file-strip ${homeFiles.length > 0 ? 'show' : ''}`}>
                {homeFiles.map((f, i) => (
                  <div key={i} className="file-chip">📄 {f.name} <span className="fc-remove" onClick={() => setHomeFiles(hf => hf.filter((_, j) => j !== i))}>✕</span></div>
                ))}
              </div>
              <div className="glass-input">
                <textarea ref={homeInpRef} id="homeInp" placeholder="What are you working on?" rows={1}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); homeSubmit(); } }}
                  onInput={e => autoResize(e.currentTarget, 150)} />
                <div className="glass-footer">
                  <div className="gf-left">
                    <button className="icon-btn" onClick={() => homeFileRef.current?.click()} title="Attach file">
                      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48" /></svg>
                    </button>
                    <div className={`input-agent-pill ${isLlama ? 'model-active' : ''}`} style={{ pointerEvents: 'auto', cursor: 'pointer' }} onClick={() => setModel('llama-3.3-70b-versatile')}>⚡ Llama 3.3 (Code & Chat)</div>
                    <div className={`input-agent-pill ${!isLlama ? 'model-active' : ''}`} style={{ pointerEvents: 'auto', cursor: 'pointer' }} onClick={() => setModel('meta-llama/llama-4-scout-17b-16e-instruct')}>👁 Llama Scout (Vision & PDF)</div>
                    <input ref={homeFileRef} type="file" id="fileInput" multiple accept=".txt,.py,.js,.ts,.jsx,.tsx,.html,.css,.json,.md,.csv,.pdf,.png,.jpg,.jpeg" onChange={e => handleHomeFiles(e.currentTarget)} style={{ display: 'none' }} />
                  </div>
                  <button className="send-btn" onClick={homeSubmit}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m5 12 7-7 7 7" /><path d="M12 19V5" /></svg>
                  </button>
                </div>
              </div>
              <div className="chips-wrap">
                {[
                  { txt: 'Generate code to ', icon: '💻', label: 'Generate Code' },
                  { txt: 'Launch app for ', icon: '🚀', label: 'Launch App' },
                  { txt: 'Write UI components for ', icon: '🧩', label: 'UI Components' },
                  { txt: 'Give me theme ideas for ', icon: '🎨', label: 'Theme Ideas' },
                  { txt: 'Build user dashboard for ', icon: '👤', label: 'User Dashboard' },
                  { txt: 'Build landing page for ', icon: '🖥️', label: 'Landing Page' },
                  { txt: 'Process uploaded docs for ', icon: '📄', label: 'Upload Docs' },
                  { txt: 'Generate image assets for ', icon: '🖼️', label: 'Image Assets' },
                ].map((c, i) => (
                  <div key={i} className="chip" onClick={() => startChat(c.txt)}>{c.icon} {c.label}</div>
                ))}
              </div>
            </div>
            <div className="home-author">
              <div className="av-bt">BT</div>
              Built by <strong style={{ color: 'rgba(255,255,255,.45)' }}>Bharath Thommandru</strong>
            </div>
          </div>
        )}

        {/* CHAT SCREEN */}
        {screen === 'chat' && (
          <div className="chatscreen active" id="chatScreen">
            <header className="ctop">
              <div className="ctop-logo" onClick={goHome}><BoltSvg size={15} /></div>
              <div className="ctop-info">
                <div className="ctop-name">KORDEX AI</div>
                <div className="ctop-row">
                  <span className={`mpill ${isLlama ? 'model-active' : ''}`} style={{ cursor: 'pointer' }} onClick={() => setModel('llama-3.3-70b-versatile')}>⚡ Llama 3.3 (Code & Chat)</span>
                  <span className={`mpill ${!isLlama ? 'model-active' : ''}`} style={{ cursor: 'pointer' }} onClick={() => setModel('meta-llama/llama-4-scout-17b-16e-instruct')}>👁 Llama Scout (Vision & PDF)</span>
                  <span className={`spill ${status.cls}`}><span className="sdot" /><span>{status.label}</span></span>
                </div>
              </div>
              <div className="ctop-btn" onClick={toggleSidebar}>☰</div>
              <div className="ctop-btn" onClick={clearChat}>🗑</div>
            </header>

            <div className="chat-msgs" ref={chatMsgsRef} onScroll={checkScroll}>
              {msgs.map((m, i) => (
                <div key={i} className={`msg ${m.role === 'user' ? 'user' : 'agent'}`}>
                  <div className={`mav ${m.role === 'user' ? 'user' : 'agent'}`}>
                    {m.role === 'agent' ? <BoltSvg /> : '👤'}
                  </div>
                  <div className="mbody">
                    <div className="mwho">{m.role === 'agent' ? 'KORDEX AI' : 'You'}</div>
                    {m.tools && m.tools.length > 0 && <div className="trow">{m.tools.map((t, j) => <span key={j} className="tpill">{t}</span>)}</div>}
                    {m.attachments && m.attachments.length > 0 && m.attachments.map((a, j) => <div key={j} className="file-attach">📄 {a}</div>)}
                    <div className="bubble" dangerouslySetInnerHTML={{ __html: m.html }} />
                  </div>
                </div>
              ))}
              {thinking && (
                <div className="msg agent">
                  <div className="mav agent"><BoltSvg /></div>
                  <div className="mbody">
                    <div className="mwho">KORDEX AI</div>
                    <div className="think">
                      <div className="kordex-loader" style={{ width: 28, height: 28 }}>
                        <svg width="28" height="28" viewBox="0 0 28 28" style={{ overflow: 'visible' }}>
                          <circle className="ring1" cx="14" cy="14" r={8} fill="none" stroke="#f97316" opacity={0} />
                          <circle className="ring2" cx="14" cy="14" r={8} fill="none" stroke="#fb923c" opacity={0} />
                          <g className="bolt"><path d="M17 4 L9 15 H14 L11 24 L19 13 H14 Z" fill="#f97316" /></g>
                          <g className="sp1"><circle cx="14" cy="14" r={1.5} fill="#fbbf24" /></g>
                          <g className="sp2"><circle cx="14" cy="14" r={1} fill="#fb923c" /></g>
                          <g className="sp3"><circle cx="14" cy="14" r={1} fill="#fbbf24" /></g>
                          <g className="sp4"><circle cx="14" cy="14" r={1.5} fill="#fb923c" /></g>
                        </svg>
                      </div>
                      <div className="think-info">
                        <span className="think-txt">{THINK_CYCLE[thinkIdx].t}</span>
                        <span className="think-sub">{THINK_CYCLE[thinkIdx].s}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className={`scrbtn ${showScroll ? 'show' : ''}`} onClick={scrollBottom}>↓</div>

            <div className="ciarea">
              <div className={`chat-file-strip ${chatFiles.length > 0 ? 'show' : ''}`}>
                {chatFiles.map((f, i) => (
                  <div key={i} className="file-chip">📄 {f.name} <span className="fc-remove" onClick={() => setChatFiles(cf => cf.filter((_, j) => j !== i))}>✕</span></div>
                ))}
              </div>
              <div className="cglass">
                <div className="cglass-top">
                  <textarea ref={chatInpRef} id="chatInp" placeholder="Ask anything about code…" rows={1}
                    onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMsg(); } }}
                    onInput={e => autoResize(e.currentTarget, 130)} />
                  <button className="csend" disabled={busy} onClick={sendMsg}>↑</button>
                </div>
                <div className="cglass-footer">
                  <div className="cglass-footer-l">
                    <button className="icon-btn" onClick={() => chatFileRef.current?.click()} title="Attach file">📎</button>
                    <input ref={chatFileRef} type="file" id="chatFileInput" multiple accept=".txt,.py,.js,.ts,.jsx,.tsx,.html,.css,.json,.md,.csv,.pdf,.png,.jpg,.jpeg" onChange={e => handleChatFiles(e.currentTarget)} style={{ display: 'none' }} />
                  </div>
                </div>
                <div className="chat-chips">
                  {[
                    { t: 'Write a Python scraper', l: '🐍 Python' },
                    { t: 'Fix this bug:\n\n', l: '🐛 Fix bug' },
                    { t: 'Build a REST API in Node.js', l: '🌐 Node.js' },
                    { t: 'Write a React component for ', l: '⚛️ React' },
                    { t: 'Refactor this code:\n\n', l: '♻️ Refactor' },
                    { t: 'Explain this:\n\n', l: '💡 Explain' },
                    { t: 'Write SQL query to ', l: '🗄️ SQL' },
                    { t: 'Write Dockerfile for ', l: '🐳 Docker' },
                  ].map((c, i) => (
                    <div key={i} className="cchip" onClick={() => sp(c.t)}>{c.l}</div>
                  ))}
                </div>
              </div>
              <div className="cfoot">
                <span className="cfoot-l">Enter to send · Shift+Enter for new line</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
