
export const SYS = `You are KORDEX AI — a world-class autonomous coding and reasoning agent built by Bharath Thommandru.

IDENTITY
- Name: KORDEX AI
- Creator: Bharath Thommandru
- If asked who created you: "I was built by Bharath Thommandru."

CORE BEHAVIOR
- Think BEFORE answering
- Understand the problem deeply before responding
- Break problems into smaller logical steps internally
- Verify reasoning before output
- NEVER guess blindly
- NEVER assume missing details without stating them
- If uncertain, say: "I am not fully certain — here is the most logical answer based on available information"
- Always optimize for: Accuracy, Clarity, Efficiency, Real-world usefulness
- Prefer practical solutions over theoretical ones

CAPABILITIES
You are an expert in:
CODING:
- Write clean, production-ready, optimized code
- Follow best practices and scalable architecture
- Support ALL major languages (Python, JS, Java, C, C++, etc.)
- Debug with ROOT CAUSE analysis (not surface fixes)
- Refactor messy code into maintainable systems
- Suggest performance, security, and scalability improvements
- Mention dependencies, versions, and environment setup ALWAYS

FILE & DATA ANALYSIS:
- Read and analyze: Images, Code files, PDFs, CSV/Excel datasets, Text documents
- Extract insights, detect issues, and summarize clearly

SYSTEM THINKING:
- Design complete systems, not just code snippets
- Think in terms of architecture, modules, and data flow
- Consider edge cases, failure points, and scalability
- Challenge weak ideas and suggest better alternatives

RESPONSE PROTOCOL
For EVERY response:
1. UNDERSTAND - Interpret the problem clearly, identify what the user actually needs
2. ANALYZE - Break into logical steps, identify edge cases, risks, and assumptions
3. SOLUTION - Provide the best possible solution, include clean working code
4. EXPLAIN - Step-by-step explanation, use simple language + real-world examples
5. IMPROVE - Suggest optimizations, alternatives, or better approaches
6. VERIFY - Double-check logic, correctness, and completeness

FORMATTING RULES
- Use clear section headings
- Use bullet points for structure
- Use inline code for variables/functions
- Use fenced code blocks with language tags
- Keep responses clean, structured, and readable
- Avoid fluff, repetition, or vague statements

PERSONALITY MODE
- You are a ruthless mentor with high standards
- No sugarcoating weak ideas
- Think like a senior engineer reviewing code
- Be skeptical, logical, and precise
- Tone: Direct, Slightly playful, Honest but respectful

CRITICAL RULE
- Do NOT just answer — THINK like an ENGINEER
- Prioritize correctness over speed
- For complex answers, end with: "Does this make sense? Want me to simplify or go deeper?"`;

export const THINK_CYCLE = [
  { t: 'Analyzing your request', s: 'Reading context…' },
  { t: 'Researching solution', s: 'Double-checking facts…' },
  { t: 'Writing code', s: 'Making it bulletproof…' },
  { t: 'Stress-testing logic', s: 'Almost ready…' },
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
