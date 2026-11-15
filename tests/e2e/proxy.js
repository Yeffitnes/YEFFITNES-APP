// Supabase de mentira para probar la app de punta a punta: /rest → PostgREST real; /auth → mínimo; storage en memoria (30-oct:
// sube, firma enlaces y borra, con el tipo y tamaño permitidos de cada bucket); realtime ausente.
const http = require("http"), crypto = require("crypto");
const SECRET = "super-secret-jwt-token-with-at-least-32-characters-long";
const b64u = (b) => Buffer.from(b).toString("base64url");
const sign = (p) => { const h = b64u(JSON.stringify({ alg: "HS256", typ: "JWT" })), b = b64u(JSON.stringify(p)); return `${h}.${b}.${crypto.createHmac("sha256", SECRET).update(`${h}.${b}`).digest("base64url")}`; };
const verify = (t) => { try { const [h, b, s] = t.split("."); if (crypto.createHmac("sha256", SECRET).update(`${h}.${b}`).digest("base64url") !== s) return null; const p = JSON.parse(Buffer.from(b, "base64url")); return p.exp * 1000 > Date.now() ? p : null; } catch { return null; } };
const user = (id) => ({ id, aud: "authenticated", role: "authenticated", email: `${id.slice(-2)}@t`, app_metadata: { provider: "email" }, user_metadata: {}, created_at: "2026-10-01T00:00:00Z" });
const session = (id) => { const exp = Math.floor(Date.now() / 1000) + 3600; return { access_token: sign({ sub: id, role: "authenticated", aud: "authenticated", exp, iat: exp - 3600 }), token_type: "bearer", expires_in: 3600, expires_at: exp, refresh_token: id, user: user(id) }; };
module.exports = { session, sign };
if (require.main === module) {
  const LAT = Number(process.env.LATENCY || 0);   // demora artificial por consulta (ms), para parecerse a la red real
  const handler = (req, res) => {
    const u = new URL(req.url, "http://x"), cors = { "access-control-allow-origin": req.headers.origin || "*", "access-control-allow-headers": "*", "access-control-allow-methods": "*", "access-control-allow-credentials": "true", "access-control-expose-headers": "*" };
    if (req.method === "OPTIONS") { res.writeHead(204, cors); return res.end(); }
    const json = (code, o) => { res.writeHead(code, { ...cors, "content-type": "application/json" }); res.end(JSON.stringify(o)); };
    if (u.pathname.startsWith("/rest/v1/") && LAT && !req.delayed) { req.delayed = true; req.pause(); return setTimeout(() => { req.resume(); handler(req, res); }, LAT); }
    if (u.pathname.startsWith("/rest/v1/")) {
      const headers = { ...req.headers }; delete headers.host;
      const p = http.request({ host: "127.0.0.1", port: 3001, path: u.pathname.slice(8) + u.search, method: req.method, headers }, (r) => { res.writeHead(r.statusCode, { ...r.headers, ...cors }); r.pipe(res); });
      p.on("error", () => json(502, { message: "postgrest down" })); return req.pipe(p);
    }
    if (u.pathname === "/auth/v1/user") { const t = (req.headers.authorization || "").replace(/^Bearer /, ""), p = verify(t); return p ? json(200, user(p.sub)) : json(401, { code: 401, msg: "invalid JWT" }); }
    if (u.pathname === "/auth/v1/token") { let b = ""; req.on("data", (c) => (b += c)); return req.on("end", () => { const j = JSON.parse(b || "{}"); return j.refresh_token ? json(200, session(j.refresh_token)) : json(400, { error: "invalid_grant" }); }); }
    if (u.pathname === "/auth/v1/logout") { res.writeHead(204, cors); return res.end(); }
    if (u.pathname.startsWith("/auth/v1/.well-known")) return json(200, { keys: [] });
    if (u.pathname.startsWith("/storage/v1/")) return globalThis.storage(req, res, u, json);
    json(404, { message: "not in e2e stub", path: u.pathname });
  };
  // Storage mínimo: lo justo para probar fotos de progreso y de mensajes. No valida las políticas de Storage (eso lo hacen las pruebas RLS de la tabla).
  const files = new Map(), RULES = { "progress-photos": { max: 5242880, types: ["image/jpeg", "image/webp"] } };
  const body = (req) => new Promise((ok) => { const ch = []; req.on("data", (c) => ch.push(c)); req.on("end", () => ok(Buffer.concat(ch))); });
  globalThis.storage = async (req, res, u, json) => {
    let m;
    if (req.method === "GET" && (m = u.pathname.match(/^\/storage\/v1\/object\/sign\/(.+)$/))) { const f = files.get(decodeURIComponent(m[1])); if (!f) return json(404, { message: "not found" }); res.writeHead(200, { "content-type": f.type, "access-control-allow-origin": "*" }); return res.end(f.data); }   // enlace firmado: sin sesión, como en Supabase
    const tok = (req.headers.authorization || "").replace(/^Bearer /, ""); if (!verify(tok)) return json(401, { statusCode: "401", error: "Unauthorized", message: "jwt" });
    if (req.method === "POST" && (m = u.pathname.match(/^\/storage\/v1\/object\/sign\/([^/]+)$/))) { const j = JSON.parse((await body(req)).toString() || "{}"); return json(200, (j.paths || []).map((p) => ({ path: p, signedURL: `/object/sign/${m[1]}/${p}?token=x`, error: files.has(`${m[1]}/${p}`) ? null : "not found" }))); }
    if (req.method === "GET" && (m = u.pathname.match(/^\/storage\/v1\/object\/(?:sign|public|authenticated)\/(.+)$/))) { const f = files.get(decodeURIComponent(m[1])); if (!f) return json(404, { message: "not found" }); res.writeHead(200, { "content-type": f.type, "access-control-allow-origin": "*" }); return res.end(f.data); }
    if ((req.method === "POST" || req.method === "PUT") && (m = u.pathname.match(/^\/storage\/v1\/object\/([^/]+)\/(.+)$/))) {
      let data = await body(req), type = (req.headers["content-type"] || "").split(";")[0]; const r = RULES[m[1]];
      if (type === "multipart/form-data") {   // supabase-js manda el archivo dentro de un formulario: se toma la parte que trae el archivo
        const bnd = "--" + /boundary=([^;]+)/.exec(req.headers["content-type"])[1], raw = data.toString("latin1");
        const part = raw.split(bnd).find((x) => /filename=|name=""/.test(x) && /Content-Type:/i.test(x)) || "";
        type = (/Content-Type:\s*([^\r\n]+)/i.exec(part) || [])[1] || "application/octet-stream";
        const start = part.indexOf("\r\n\r\n") + 4; data = Buffer.from(part.slice(start, part.length - 2), "latin1");
      }
      if (r && !r.types.includes(type)) return json(400, { statusCode: "415", error: "invalid_mime_type", message: `mime type ${type} is not supported` });
      if (r && data.length > r.max) return json(400, { statusCode: "413", error: "Payload too large", message: "The object exceeded the maximum allowed size" });
      files.set(`${m[1]}/${decodeURIComponent(m[2])}`, { data, type }); console.log("storage put", m[1], m[2], type, data.length); return json(200, { Key: `${m[1]}/${m[2]}`, Id: m[2] });
    }
    if (req.method === "DELETE" && (m = u.pathname.match(/^\/storage\/v1\/object\/([^/]+)$/))) { const j = JSON.parse((await body(req)).toString() || "{}"); (j.prefixes || []).forEach((p) => files.delete(`${m[1]}/${p}`)); return json(200, (j.prefixes || []).map((name) => ({ name }))); }
    return json(404, { message: "storage path not in stub", path: u.pathname });
  };
  http.createServer(handler).listen(54321, () => console.log("proxy 54321"));
}
