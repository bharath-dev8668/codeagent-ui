
export const SYS = `You are KORDEX, a senior software engineering assistant.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    SCOPE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

You specialize in: Programming, Debugging, System Design, Architecture, DevOps, AI/ML, Databases, Security, Cloud, Algorithms, Web Development, Mobile Development, Code Reviews, Performance Optimization, and Technical Documentation.

If a request falls outside software engineering, respond warmly but briefly:
"That's outside my area of focus — I specialize in software engineering, programming, and technical problem-solving. If you've got a coding challenge or architecture question, I'm happy to help."

Do not sound cold, robotic, or dismissive. Be respectful and redirect naturally.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    GREETINGS & IDENTITY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

When greeted, respond naturally and briefly:
- "Hey! What are we building today?"
- "Hello! Need help with something?"
- "Hey — what can I help you with?"

Keep it one line. Do not advertise capabilities. Do not over-explain what you do.

If asked who built you, reply: "I'm KORDEX, built by Bharath Thommandru."

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    CODING STANDARDS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

- Write clean, production-ready code.
- Follow best practices and scalable architecture.
- Support all major languages and frameworks.
- Debug with root cause analysis, not surface-level fixes.
- Never fabricate APIs, libraries, or commands.
- Mention relevant dependencies and setup when useful.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    ARCHITECTURE & DEBUGGING
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Think in systems, not snippets. Consider: scalability, maintainability, security, error handling, and deployment.

When debugging: identify root cause, explain why it happened, show how to fix it, and note how to prevent it.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    RESPONSE STYLE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Communicate like a senior developer talking to another engineer.

- Keep responses proportional: short answers for simple questions, detailed explanations for complex problems.
- Use headings, code blocks, and bullet points only when they improve clarity.
- No mandatory section structure. Adapt format to the question.
- Avoid: "Does this make sense?", "Let me know if you need more", "I hope this helps", "Want me to explain further?"
- Never use ALL CAPS for emphasis.
- Never use excessive emojis or decorative formatting.
- End responses naturally. Do not add filler closings.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    PERSONALITY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Tone: Professional, confident, friendly, and direct.
Think like a senior engineer mentoring another developer.
Be honest. If uncertain, say so clearly rather than guessing.
Prioritize correctness over speed.
Never be arrogant, rude, or overly casual.`;

export const THINK_CYCLE = [
  { t: 'Analyzing request', s: 'Processing context' },
  { t: 'Researching approach', s: 'Evaluating options' },
  { t: 'Writing solution', s: 'Crafting response' },
  { t: 'Verifying logic', s: 'Almost done' },
];

export function esc(s: string) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export function fmt(raw: string) {
  let r = raw;
  r = r.replace(/```(\w*)\n?([\s\S]*?)```/g, (_, l, c) =>
    `<pre><span class="ltag">${l || 'code'}</span><code>${esc(c.trim())}</code></pre>`
  );
  r = r.replace(/`([^`\n]+)`/g, '<code>$1</code>');
  r = r.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  r = r.replace(/\n/g, '<br>');
  return r;
}

export interface FileResult {
  type: 'image' | 'pdf' | 'text';
  data: any;
  name: string;
  mime?: string;
}

export function readFileText(file: File): Promise<FileResult> {
  return new Promise((res) => {
    if (file.type.startsWith('image/')) {
      const r = new FileReader();
      r.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          const max_dim = 1200; // Resize to max 1200px to avoid Vercel 4.5MB payload limit
          if (width > max_dim || height > max_dim) {
            if (width > height) {
              height = Math.round((height * max_dim) / width);
              width = max_dim;
            } else {
              width = Math.round((width * max_dim) / height);
              height = max_dim;
            }
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (ctx) ctx.drawImage(img, 0, 0, width, height);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.85); // Use JPEG compression to reduce size
          res({ type: 'image', data: dataUrl, name: file.name, mime: 'image/jpeg' });
        };
        img.onerror = () => res({ type: 'text', data: '[Could not read image: ' + file.name + ']', name: file.name });
        img.src = e.target?.result as string;
      };
      r.onerror = () => res({ type: 'text', data: '[Could not read image: ' + file.name + ']', name: file.name });
      r.readAsDataURL(file);
    } else if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
      const r = new FileReader();
      r.onload = (e) => res({ type: 'pdf', data: e.target?.result, name: file.name, mime: 'application/pdf' });
      r.onerror = () => res({ type: 'text', data: '[Could not read PDF: ' + file.name + ']', name: file.name });
      r.readAsArrayBuffer(file);
    } else {
      const r = new FileReader();
      r.onload = (e) => res({ type: 'text', data: e.target?.result, name: file.name });
      r.onerror = () => res({ type: 'text', data: '[Could not read: ' + file.name + ']', name: file.name });
      r.readAsText(file);
    }
  });
}

declare const pdfjsLib: any;

export async function extractPDFText(arrayBuffer: ArrayBuffer): Promise<string> {
  pdfjsLib.GlobalWorkerOptions.workerSrc =
    'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  let text = '';
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const pageText = content.items.map((item: any) => item.str).join(' ');
    text += `\n\n--- Page ${i} ---\n${pageText}`;
  }
  return text.trim();
}

export const BOLT_SVG = `<svg viewBox="0 0 18 18" fill="none" style="width:16px;height:16px"><path d="M10.5 1L4 10h5L7 17L14 8H9L10.5 1Z" fill="#F97316" stroke="#F97316" stroke-width=".5" stroke-linejoin="round"/></svg>`;

export const THINK_HTML = `<div class="mav agent">${BOLT_SVG}</div><div class="mbody"><div class="mwho">KORDEX AI</div><div class="think"><div class="kordex-loader" style="width:28px;height:28px"><svg width="28" height="28" viewBox="0 0 28 28" style="overflow:visible"><circle class="ring1" cx="14" cy="14" r="8" fill="none" stroke="#f97316" opacity="0"/><circle class="ring2" cx="14" cy="14" r="8" fill="none" stroke="#fb923c" opacity="0"/><g class="bolt"><path d="M17 4 L9 15 H14 L11 24 L19 13 H14 Z" fill="#f97316"/></g><g class="sp1"><circle cx="14" cy="14" r="1.5" fill="#fbbf24"/></g><g class="sp2"><circle cx="14" cy="14" r="1" fill="#fb923c"/></g><g class="sp3"><circle cx="14" cy="14" r="1" fill="#fbbf24"/></g><g class="sp4"><circle cx="14" cy="14" r="1.5" fill="#fb923c"/></g></svg></div><div class="think-info"><span class="think-txt" id="tt">Analyzing your request</span><span class="think-sub" id="ts">Reading context…</span></div></div></div>`;
