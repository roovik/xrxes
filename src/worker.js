// XRXES: the static site in ./public, plus a small Worker for the contact form, anonymous showroom view counts and an admin page.
// ADMIN_KEY (a long password for /admin/) is a secret set in the Cloudflare dashboard. RESEND_KEY, MAIL_FROM and NOTIFY_EMAIL optionally email each new lead.
import { DurableObject } from 'cloudflare:workers';
const json = (o, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });
const clean = (s, n) => String(s == null ? '' : s).replace(/[\u0000-\u0009\u000b-\u001f<>]/g, '').trim().slice(0, n);
const stub = env => env.LEADS.get(env.LEADS.idFromName('main'));
function keyOk(req, env) { const a = env.ADMIN_KEY || '', b = req.headers.get('x-admin-key') || ''; if (a.length < 12 || a.length !== b.length) return false; let d = 0; for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i); return d === 0; }

export default {
  async fetch(request, env) {
    const url = new URL(request.url), p = url.pathname;
    if (p.startsWith('/api/')) {
      if (request.method === 'POST') { const o = request.headers.get('origin'); if (o && new URL(o).host !== url.host) return json({ ok: false }, 403); }
      if (p === '/api/contact' && request.method === 'POST') {
        let b = {}; try { b = await request.json(); } catch (e) {}
        const lead = { name: clean(b.name, 80), email: clean(b.email, 254).toLowerCase(), company: clean(b.company, 120), interest: clean(b.interest, 60), message: clean(b.message, 2000), country: (request.cf && request.cf.country) || '', ip: request.headers.get('cf-connecting-ip') || '' };
        if (!lead.name || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(lead.email)) return json({ ok: false, error: 'Enter your name and a valid email.' }, 400);
        const r = await (await stub(env).fetch('https://internal/lead', { method: 'POST', body: JSON.stringify(lead) })).json();
        if (r.ok && env.RESEND_KEY && env.MAIL_FROM && env.NOTIFY_EMAIL) { try { await fetch('https://api.resend.com/emails', { method: 'POST', headers: { authorization: 'Bearer ' + env.RESEND_KEY, 'content-type': 'application/json' }, body: JSON.stringify({ from: env.MAIL_FROM, to: [env.NOTIFY_EMAIL], reply_to: lead.email, subject: 'New XRXES lead: ' + lead.interest, text: Object.entries(lead).filter(([k]) => k !== 'ip').map(([k, v]) => k + ': ' + v).join('\n') }) }); } catch (e) {} }
        return json(r, r.ok ? 200 : 429);
      }
      if (p === '/api/event' && request.method === 'POST') { let b = {}; try { b = await request.json(); } catch (e) {} await stub(env).fetch('https://internal/event', { method: 'POST', body: JSON.stringify({ type: clean(b.type, 20), slug: clean(b.slug, 80) }) }); return json({ ok: true }); }
      if (p === '/api/admin') { if (!env.ADMIN_KEY) return json({ ok: false, error: 'Set the ADMIN_KEY secret in the Cloudflare dashboard first.' }, 501); if (!keyOk(request, env)) return json({ ok: false, error: 'Wrong admin key.' }, 401); return stub(env).fetch('https://internal/admin'); }
      return json({ ok: false }, 404);
    }
    if (p === '/admin/' || p === '/admin') return env.ASSETS.fetch(new Request(url.origin + '/admin.html'));
    return env.ASSETS.fetch(request);
  }
};

export class LeadsDB extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env); this.sql = ctx.storage.sql;
    this.sql.exec('CREATE TABLE IF NOT EXISTS leads (id INTEGER PRIMARY KEY AUTOINCREMENT, at INTEGER, name TEXT, email TEXT, company TEXT, interest TEXT, message TEXT, country TEXT)');
    this.sql.exec('CREATE TABLE IF NOT EXISTS events (day TEXT, type TEXT, slug TEXT, n INTEGER, PRIMARY KEY (day, type, slug))');
    this.sql.exec('CREATE TABLE IF NOT EXISTS hits (k TEXT, at INTEGER)');
  }
  async fetch(req) {
    const p = new URL(req.url).pathname, b = req.method === 'POST' ? await req.json() : {};
    if (p === '/lead') {
      this.sql.exec('DELETE FROM hits WHERE at < ?', Date.now() - 3600000);
      if ([...this.sql.exec('SELECT COUNT(*) AS n FROM hits WHERE k = ?', b.ip)][0].n >= 5) return json({ ok: false, error: 'Too many messages. Try again later.' });
      this.sql.exec('INSERT INTO hits (k, at) VALUES (?, ?)', b.ip, Date.now());
      this.sql.exec('INSERT INTO leads (at, name, email, company, interest, message, country) VALUES (?, ?, ?, ?, ?, ?, ?)', Date.now(), b.name, b.email, b.company, b.interest, b.message, b.country);
      return json({ ok: true });
    }
    if (p === '/event') { if (!/^[a-z-]{1,20}$/.test(b.type)) return json({ ok: false }); this.sql.exec('INSERT INTO events (day, type, slug, n) VALUES (?, ?, ?, 1) ON CONFLICT (day, type, slug) DO UPDATE SET n = n + 1', new Date().toISOString().slice(0, 10), b.type, b.slug || ''); return json({ ok: true }); }
    if (p === '/admin') return json({ ok: true, leads: [...this.sql.exec('SELECT * FROM leads ORDER BY at DESC LIMIT 500')], events: [...this.sql.exec('SELECT type, slug, SUM(n) AS n FROM events GROUP BY type, slug ORDER BY n DESC LIMIT 200')], days: [...this.sql.exec("SELECT day, SUM(n) AS n FROM events WHERE type = 'open' GROUP BY day ORDER BY day DESC LIMIT 60")] });
    return json({ ok: false }, 404);
  }
}
