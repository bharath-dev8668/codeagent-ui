import { NextRequest, NextResponse } from 'next/server';

export const maxDuration = 60; // Max allowed for Vercel free tier

const GROQ_API_KEY = process.env.GROQ_API_KEY || process.env.NEXT_PUBLIC_AI_API_KEY || '';

export async function POST(req: NextRequest) {
  if (!GROQ_API_KEY) {
    return NextResponse.json(
      { error: { message: 'Server API key not configured' } },
      { status: 500 }
    );
  }

  try {
    const body = await req.json();

    // Validate required fields
    if (!body.model || !body.messages) {
      return NextResponse.json(
        { error: { message: 'Missing model or messages' } },
        { status: 400 }
      );
    }

    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: body.model,
        max_tokens: body.max_tokens || 4096,
        temperature: body.temperature ?? 0.3,
        messages: body.messages,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      return NextResponse.json(
        { error: data.error || { message: 'Groq API error' } },
        { status: res.status }
      );
    }

    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json(
      { error: { message: err.message || 'Internal server error' } },
      { status: 500 }
    );
  }
}
