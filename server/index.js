const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");

const app = express();

// CORS 설정
const corsOptions = {
  origin: "http://localhost:5173",
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
let participants = [];
let notices = [];
let questions = [];

io.on("connection", (socket) => {
  console.log(`✅ 유저 접속됨: ${socket.id}`);

  // 초기 데이터 전송
  socket.emit("vote data", votes);
  socket.emit("notices_update", notices);
  socket.emit("questions_update", questions);

  // 투표 데이터 요청
  socket.on("request_votes", () => {
    console.log('Votes requested, sending:', votes);
    socket.emit("vote data", votes);
  });

  // 질문 데이터 요청
  socket.on("request_questions", () => {
    console.log('Questions requested by client:', socket.id);
    console.log('Current questions:', questions);
    socket.emit("questions_update", questions);
  });

  socket.on("chat message", (data) => {
    io.emit("chat message", data);
  });

  socket.on("create_vote", (voteData) => {
    console.log('Creating new vote:', voteData);
    const newVote = {
      id: Date.now().toString(),
      ...voteData,
      results: voteData.options.map(() => 0),
      voters: [],
      isActive: true,
      createdAt: new Date()
    };
    votes.push(newVote);
    console.log('Updated votes:', votes);
    io.emit("vote data", votes);
  });

  socket.on("submit_vote", ({ voteId, option }) => {
    console.log('Vote submitted:', { voteId, option });
    const vote = votes.find(v => v.id === voteId);
    if (vote && vote.isActive) {
      vote.results[option]++;
      vote.voters.push(socket.id);
      io.emit("vote data", votes);
    }
  });

  socket.on("end_vote", (voteId) => {
    console.log('Ending vote:', voteId);
    const vote = votes.find(v => v.id === voteId);
    if (vote) {
      vote.isActive = false;
      io.emit("vote data", votes);
    }
  });

  socket.on("delete_vote", (voteId) => {
    console.log('Deleting vote:', voteId);
    votes = votes.filter(v => v.id !== voteId);
    io.emit("vote data", votes);
  });

  // 질문 관련 이벤트
  socket.on("submit_question", (question) => {
    console.log('New question submitted by:', socket.id);
    const newQuestion = {
      ...question,
      id: Date.now().toString(),
      status: 'pending',
      timestamp: new Date().toISOString()
    };
    console.log('Created new question:', newQuestion);
    questions.push(newQuestion);
    io.emit("questions_update", questions);
    io.emit("new_question", newQuestion);  // 새 질문 이벤트도 함께 발송
  });

  socket.on("update_question_status", ({ questionId, status }) => {
    console.log('Question status update requested:', { questionId, status, by: socket.id });
    const question = questions.find(q => q.id === questionId);
    if (question) {
      question.status = status;
      console.log('Question updated:', question);
      io.emit("questions_update", questions);
    } else {
      console.log('Question not found:', questionId);
    }
  });

  socket.on("participant_join", ({ nickname, id, isAdmin }) => {
    // 기존 참가자 제거 (재접속 시 처리)
    participants = participants.filter(p => p.id !== id);
    
    // 새 참가자 추가
    participants.push({ 
      nickname, 
      id, 
      isAdmin,
      isOnline: true,
      joinedAt: new Date().toISOString()
    });
    
    console.log('Participant joined:', { nickname, id, isAdmin });
    io.emit("participants_update", participants);
  });

  socket.on("disconnect", () => {
    console.log(`❌ 유저 접속 종료: ${socket.id}`);
    // 참가자 목록에서 제거
    participants = participants.filter(p => p.id !== socket.id);
    io.emit("participants_update", participants);
  });

  socket.on("add_notice", (notice) => {
    console.log('Adding new notice:', notice);
    const newNotice = {
      ...notice,
      id: Date.now().toString()
    };
    notices.push(newNotice);
    io.emit("notices_update", notices);
  });

  socket.on("delete_notice", (noticeId) => {
    console.log('Deleting notice:', noticeId);
    notices = notices.filter(n => n.id !== noticeId);
    io.emit("notices_update", notices);
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

