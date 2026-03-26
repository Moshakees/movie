import { NextResponse } from 'next/server';

const EXTERNAL_API = 'https://kira-api.xo.je/akwam.php';

export async function GET() {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

  try {
    const res = await fetch(`${EXTERNAL_API}?action=featured`, { 
      cache: 'no-store',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json'
      }
    });

    const text = await res.text();
    let json = null;
    try {
      json = JSON.parse(text);
    } catch (e) {}

    return NextResponse.json({
      status: res.status,
      ok: res.ok,
      headers: Object.fromEntries(res.headers.entries()),
      bodyText: text,
      bodyJson: json
    });
  } catch (e) {
    return NextResponse.json({ error: e.message, stack: e.stack });
  }
}
