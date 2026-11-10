const JSON_HEADERS = { "content-type": "application/json; charset=utf-8" };
const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const GAME_IDS = new Set(["boat", "mountain", "millionaire", "mystery"]);

function json(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), { status, headers: { ...JSON_HEADERS, ...headers } });
}
function fail(message, status = 400) { return json({ ok: false, error: message }, status); }
function cors(request, env) {
  const origin = request.headers.get("Origin") || "";
  const allowed = env.ALLOWED_ORIGIN || "*";
  return {
    "access-control-allow-origin": allowed === "*" || origin === allowed ? (allowed === "*" ? "*" : origin) : allowed,
    "access-control-allow-methods": "GET,POST,OPTIONS",
    "access-control-allow-headers": "content-type,authorization,x-host-token",
    "access-control-max-age": "86400",
    "vary": "Origin"
  };
}
function withCors(response, request, env) {
  const headers = new Headers(response.headers);
  for (const [key, value] of Object.entries(cors(request, env))) headers.set(key, value);
  return new Response(response.body, { status: response.status, headers });
}
async function body(request) {
  try { return await request.json(); } catch { return null; }
}
function makeCode(length = 5) {
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  return [...bytes].map(v => CODE_CHARS[v % CODE_CHARS.length]).join("");
}
function id() { return crypto.randomUUID(); }
async function sha256(value) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return [...new Uint8Array(digest)].map(v => v.toString(16).padStart(2, "0")).join("");
}
function cleanText(value, max = 120) { return String(value ?? "").trim().slice(0, max); }
async function getRoom(env, code) {
  return env.DB.prepare("SELECT * FROM rooms WHERE code = ?").bind(code).first();
}
async function publicRoom(env, room) {
  const players = await env.DB.prepare(
    "SELECT id, display_name AS name, team_name AS team, score, joined_at FROM players WHERE room_code = ? ORDER BY joined_at"
  ).bind(room.code).all();
  return {
    code: room.code, title: room.title, gameId: room.game_id, status: room.status,
    settings: JSON.parse(room.settings_json || "{}"),
    questionCount: JSON.parse(room.questions_json || "[]").length,
    currentQuestion: room.current_question,
    players: players.results || [],
    createdAt: room.created_at
  };
}
async function broadcast(env, code, event) {
  const stub = env.ROOMS.get(env.ROOMS.idFromName(code));
  await stub.fetch("https://room.internal/broadcast", {
    method: "POST", headers: JSON_HEADERS, body: JSON.stringify(event)
  });
}

export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") return withCors(new Response(null, { status: 204 }), request, env);
    const url = new URL(request.url);
    const parts = url.pathname.split("/").filter(Boolean);
    if (url.pathname === "/api/health") return withCors(json({ ok: true, service: "tri-thuc-game-api", version: 1 }), request, env);
    if (parts[0] !== "api" || parts[1] !== "rooms") return withCors(fail("Không tìm thấy API.", 404), request, env);

    try {
      if (request.method === "POST" && parts.length === 2) {
        const input = await body(request);
        if (!input) return withCors(fail("Dữ liệu gửi lên không hợp lệ."), request, env);
        const gameId = cleanText(input.gameId, 30);
        if (!GAME_IDS.has(gameId)) return withCors(fail("Trò chơi không hợp lệ."), request, env);
        const title = cleanText(input.title, 100) || "Phòng học mới";
        const questions = Array.isArray(input.questions) ? input.questions.slice(0, 200) : [];
        if (!questions.length) return withCors(fail("Phòng chơi cần có ít nhất một câu hỏi."), request, env);
        for (const q of questions) {
          if (!cleanText(q.question, 1000) || !Array.isArray(q.options) || q.options.length !== 4 ||
              !Number.isInteger(q.correctIndex) || q.correctIndex < 0 || q.correctIndex > 3) {
            return withCors(fail("Có câu hỏi chưa đúng định dạng."), request, env);
          }
        }
        let code = makeCode();
        for (let i = 0; i < 5 && await getRoom(env, code); i++) code = makeCode();
        const hostToken = crypto.randomUUID() + crypto.randomUUID();
        const settings = {
          secondsPerQuestion: Math.min(120, Math.max(5, Number(input.settings?.secondsPerQuestion) || 20)),
          teamCount: Math.min(20, Math.max(1, Number(input.settings?.teamCount) || 4))
        };
        await env.DB.prepare(
          "INSERT INTO rooms (code,title,game_id,host_token_hash,settings_json,questions_json) VALUES (?,?,?,?,?,?)"
        ).bind(code, title, gameId, await sha256(hostToken), JSON.stringify(settings), JSON.stringify(questions)).run();
        const room = await getRoom(env, code);
        return withCors(json({ ok: true, room: await publicRoom(env, room), hostToken }), request, env);
      }

      const code = cleanText(parts[2], 8).toUpperCase();
      if (!code) return withCors(fail("Thiếu mã phòng."), request, env);
      const room = await getRoom(env, code);
      if (!room) return withCors(fail("Không tìm thấy phòng chơi.", 404), request, env);

      if (request.method === "GET" && parts.length === 3) {
        return withCors(json({ ok: true, room: await publicRoom(env, room) }), request, env);
      }

      if (request.method === "POST" && parts[3] === "join") {
        if (room.status !== "waiting") return withCors(fail("Phòng đã bắt đầu hoặc kết thúc.", 409), request, env);
        const input = await body(request);
        const name = cleanText(input?.name, 24);
        const team = cleanText(input?.team, 40);
        if (!name) return withCors(fail("Vui lòng nhập tên người chơi."), request, env);
        const playerId = id();
        try {
          await env.DB.prepare("INSERT INTO players (id,room_code,display_name,team_name) VALUES (?,?,?,?)")
            .bind(playerId, code, name, team).run();
        } catch {
          return withCors(fail("Tên hiển thị này đã được sử dụng trong phòng."), request, env);
        }
        const result = { ok: true, player: { id: playerId, name, team }, room: await publicRoom(env, await getRoom(env, code)) };
        await broadcast(env, code, { type: "player_joined", player: result.player, players: result.room.players });
        return withCors(json(result, 201), request, env);
      }

      if (request.method === "POST" && parts[3] === "start") {
        const token = request.headers.get("x-host-token") || "";
        if (!token || await sha256(token) !== room.host_token_hash) return withCors(fail("Mã điều khiển giáo viên không hợp lệ.", 401), request, env);
        if (room.status !== "waiting") return withCors(fail("Phòng không ở trạng thái chờ." ,409), request, env);
        await env.DB.prepare("UPDATE rooms SET status='playing', updated_at=CURRENT_TIMESTAMP WHERE code=?").bind(code).run();
        await broadcast(env, code, { type: "game_started", roomCode: code });
        return withCors(json({ ok: true, room: await publicRoom(env, await getRoom(env, code)) }), request, env);
      }

      if (request.method === "POST" && parts[3] === "answer") {
        if (room.status !== "playing") return withCors(fail("Phòng chưa bắt đầu hoặc đã kết thúc.", 409), request, env);
        const input = await body(request);
        const playerId = cleanText(input?.playerId, 64);
        const questionIndex = Number(input?.questionIndex);
        const selectedIndex = Number(input?.selectedIndex);
        const questions = JSON.parse(room.questions_json || "[]");
        const question = questions[questionIndex];
        if (!playerId || !question || !Number.isInteger(selectedIndex) || selectedIndex < 0 || selectedIndex > 3)
          return withCors(fail("Câu trả lời không hợp lệ."), request, env);
        const player = await env.DB.prepare("SELECT id FROM players WHERE id=? AND room_code=?").bind(playerId, code).first();
        if (!player) return withCors(fail("Người chơi không thuộc phòng này.", 403), request, env);
        const correct = selectedIndex === question.correctIndex;
        const points = correct ? 100 : 0;
        try {
          await env.DB.prepare("INSERT INTO answers (id,room_code,player_id,question_index,selected_index,is_correct,points_awarded) VALUES (?,?,?,?,?,?,?)")
            .bind(id(), code, playerId, questionIndex, selectedIndex, correct ? 1 : 0, points).run();
        } catch {
          return withCors(fail("Bạn đã trả lời câu hỏi này rồi.", 409), request, env);
        }
        if (points) await env.DB.prepare("UPDATE players SET score=score+?, last_seen_at=CURRENT_TIMESTAMP WHERE id=?").bind(points, playerId).run();
        const leaderboard = await env.DB.prepare("SELECT id,display_name AS name,team_name AS team,score FROM players WHERE room_code=? ORDER BY score DESC, joined_at ASC").bind(code).all();
        await broadcast(env, code, { type: "answer_recorded", playerId, questionIndex, correct, points, leaderboard: leaderboard.results || [] });
        return withCors(json({ ok: true, correct, points, leaderboard: leaderboard.results || [] }), request, env);
      }

      if (request.method === "POST" && parts[3] === "next") {
        const token = request.headers.get("x-host-token") || "";
        if (!token || await sha256(token) !== room.host_token_hash) return withCors(fail("Mã điều khiển giáo viên không hợp lệ.", 401), request, env);
        const questions = JSON.parse(room.questions_json || "[]");
        const nextIndex = room.current_question + 1;
        const finished = nextIndex >= questions.length;
        await env.DB.prepare("UPDATE rooms SET current_question=?, status=?, updated_at=CURRENT_TIMESTAMP WHERE code=?")
          .bind(finished ? room.current_question : nextIndex, finished ? "finished" : "playing", code).run();
        const event = finished ? { type: "game_finished", leaderboard: (await env.DB.prepare("SELECT id,display_name AS name,team_name AS team,score FROM players WHERE room_code=? ORDER BY score DESC").bind(code).all()).results } : { type: "question_changed", questionIndex: nextIndex };
        await broadcast(env, code, event);
        return withCors(json({ ok: true, finished, currentQuestion: finished ? room.current_question : nextIndex }), request, env);
      }

      if (request.method === "GET" && parts[3] === "leaderboard") {
        const rows = await env.DB.prepare("SELECT id,display_name AS name,team_name AS team,score FROM players WHERE room_code=? ORDER BY score DESC, joined_at ASC").bind(code).all();
        return withCors(json({ ok: true, leaderboard: rows.results || [] }), request, env);
      }
      return withCors(fail("Không tìm thấy thao tác này.", 404), request, env);
    } catch (error) {
      return withCors(fail("Máy chủ gặp lỗi khi xử lý yêu cầu.", 500), request, env);
    }
  }
};

export class RoomHub {
  constructor(state) { this.state = state; this.sessions = new Set(); }
  async fetch(request) {
    const url = new URL(request.url);
    if (url.pathname === "/broadcast" && request.method === "POST") {
      const event = await request.json();
      const message = JSON.stringify(event);
      for (const socket of this.sessions) {
        try { socket.send(message); } catch { this.sessions.delete(socket); }
      }
      return new Response("ok");
    }
    if (url.pathname === "/connect" && request.headers.get("Upgrade") === "websocket") {
      const pair = new WebSocketPair();
      const [client, server] = Object.values(pair);
      server.accept();
      this.sessions.add(server);
      server.addEventListener("close", () => this.sessions.delete(server));
      server.addEventListener("error", () => this.sessions.delete(server));
      server.send(JSON.stringify({ type: "connected" }));
      return new Response(null, { status: 101, webSocket: client });
    }
    return new Response("Not found", { status: 404 });
  }
}
