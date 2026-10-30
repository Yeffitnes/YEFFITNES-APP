// Supabase de mentira para probar la app de punta a punta: /rest → PostgREST real; /auth → mínimo; storage y realtime ausentes.
const http = require("http"), crypto = require("crypto");
const SECRET = "super-secret-jwt-token-with-at-least-32-characters-long";
const b64u = (b) => Buffer.from(b).toString("base64url");
const sign = (p) => { const h = b64u(JSON.stringify({ alg: "HS256", typ: "JWT" })), b = b64u(JSON.stringify(p)); return `${h}.${b}.${crypto.createHmac("sha256", SECRET).update(`${h}.${b}`).digest("base64url")}`; };
const verify = (t) => { try { const [h, b, s] = t.split("."); if (crypto.createHmac("sha256", SECRET).update(`${h}.${b}`).digest("base64url") !== s) return null; const p = JSON.parse(Buffer.from(b, "base64url")); return p.exp * 1000 > Date.now() ? p : null; } catch { return null; } };
const user = (id) => ({ id, aud: "authenticated", role: "authenticated", email: `${id.slice(-2)}@t`, app_metadata: { provider: "email" }, user_metadata: {}, created_at: "2026-10-01T00:00:00Z" });
const session = (id) => { const exp = Math.floor(Date.now() / 1000) + 3600; return { access_token: sign({ sub: id, role: "authenticated", aud: "authenticated", exp, iat: exp - 3600 }), token_type: "bearer", expires_in: 3600, expires_at: exp, refresh_token: id, user: user(id) }; };
module.exports = { session, sign };
if (require.main === module) {
  http.createServer((req, res) => {
    const u = new URL(req.url, "http://x"), cors = { "access-control-allow-origin": req.headers.origin || "*", "access-control-allow-headers": "*", "access-control-allow-methods": "*", "access-control-allow-credentials": "true", "access-control-expose-headers": "*" };
    if (req.method === "OPTIONS") { res.writeHead(204, cors); return res.end(); }
    const json = (code, o) => { res.writeHead(code, { ...cors, "content-type": "application/json" }); res.end(JSON.stringify(o)); };
    if (u.pathname.startsWith("/rest/v1/")) {
      const headers = { ...req.headers }; delete headers.host;
      const p = http.request({ host: "127.0.0.1", port: 3001, path: u.pathname.slice(8) + u.search, method: req.method, headers }, (r) => { res.writeHead(r.statusCode, { ...r.headers, ...cors }); r.pipe(res); });
      p.on("error", () => json(502, { message: "postgrest down" })); return req.pipe(p);
    }
    if (u.pathname === "/auth/v1/user") { const t = (req.headers.authorization || "").replace(/^Bearer /, ""), p = verify(t); return p ? json(200, user(p.sub)) : json(401, { code: 401, msg: "invalid JWT" }); }
    if (u.pathname === "/auth/v1/token") { let b = ""; req.on("data", (c) => (b += c)); return req.on("end", () => { const j = JSON.parse(b || "{}"); return j.refresh_token ? json(200, session(j.refresh_token)) : json(400, { error: "invalid_grant" }); }); }
    if (u.pathname === "/auth/v1/logout") { res.writeHead(204, cors); return res.end(); }
    if (u.pathname.startsWith("/auth/v1/.well-known")) return json(200, { keys: [] });
    json(404, { message: "not in e2e stub", path: u.pathname });
  }).listen(54321, () => console.log("proxy 54321"));
}
