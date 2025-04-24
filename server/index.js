const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");

const app = express();

// CORS 설정
const corsOptions = {
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://your-client-domain.com'] // 프로덕션 환경에서는 실제 도메인으로 변경
    : ['http://localhost:5177'], // 개발 환경에서는 로컬 클라이언트 주소
  methods: ["GET", "POST"],
  credentials: true
};

app.use(cors(corsOptions));

const server = http.createServer(app);
const io = new Server(server, {
  cors: corsOptions,
  // 추가 보안 설정
  pingTimeout: 60000,
  pingInterval: 25000,
  cookie: false
});

let votes = [];

io.on("connection", (socket) => {
  console.log(`✅ 유저 접속됨: ${socket.id}`);

  socket.emit("vote data", votes);

  socket.on("chat message", (data) => {
    io.emit("chat message", data);
  });

  socket.on("create_vote", (vote) => {
    vote.results = {};
    vote.ended = false;
    votes.push(vote);
    io.emit("vote data", votes);
  });

  socket.on("end_vote", ({ voteId }) => {
    votes = votes.map((v) =>
      v.id === voteId ? { ...v, ended: true } : v
    );
    io.emit("vote ended", voteId);
  });

  socket.on("submit_vote", ({ voteId, option, nickname }) => {
    const vote = votes.find((v) => v.id === voteId);
    if (!vote || vote.ended) return;

    if (!vote.voters) vote.voters = {};
    if (vote.voters[nickname]) return;

    vote.voters[nickname] = true;
    vote.results[option] = (vote.results[option] || 0) + 1;

    io.emit("vote results", {
      voteId,
      results: vote.results,
    });
  });

  socket.on("disconnect", () => {
    console.log(`❌ 유저 연결 해제: ${socket.id}`);
  });
});

server.listen(3001, () => {
  console.log("🚀 서버 실행 중: http://localhost:3001");
});
