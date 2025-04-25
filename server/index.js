const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");

const app = express();

// CORS 설정
const corsOptions = {
  origin: [
    'https://chat-app-blush-sigma.vercel.app',
    'http://localhost:5177'
  ],
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

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`🚀 서버 실행 중: http://localhost:${PORT}`);
});
