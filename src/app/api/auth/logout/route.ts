import { extractCookie } from "@/lib/auth/cookie-utils";
import { revokeSession, rotateSessionId } from "@/lib/supabase/service";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  if (process.env.NODE_ENV === 'production') {
    const csrfHeader = req.headers.get('x-csrf-token') || req.headers.get('X-CSRF-Token');
    if (!csrfHeader) {
      return NextResponse.json({ error: 'csrf_missing' }, { status: 403 });
    }
  }

  const cookieHeader = req.headers.get('cookie') ?? '';
  const userId = extractCookie(cookieHeader, 'sb_user_id') ?? extractCookie(cookieHeader, 'sb_session_user_id');

  try {
    if (userId) {
      await revokeSession(userId);
      await rotateSessionId(userId);
    }
  } catch (error) {
    console.error('Session revocation error:', error);
  }

  const res = NextResponse.json({ success: true });
  res.cookies.set('sb_user_id', '', { path: '/', httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict', maxAge: 0 });
  res.cookies.set('sb_session', '', { path: '/', httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict', maxAge: 0 });

  return res;
}