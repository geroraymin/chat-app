const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");

const app = express();

// CORS 설정
app.use(cors({
  origin: ["http://localhost:5173", "http://localhost:5177"],
  methods: ["GET", "POST"],
  credentials: true
}));

app.use(express.json());

const server = http.createServer(app);

// Socket.IO 설정
const io = new Server(server, {
  cors: {
    origin: ["http://localhost:5173", "http://localhost:5177"],
    methods: ["GET", "POST"],
    credentials: true
  },
  pingTimeout: 60000,
  transports: ['websocket', 'polling']
});

// 방 관리를 위한 Map 객체
const rooms = new Map();

// 4자리 숫자 방 ID 생성 함수
function generateRoomId() {
  let roomId;
  do {
    roomId = Math.floor(1000 + Math.random() * 9000).toString(); // 1000-9999
  } while (rooms.has(roomId));
  return roomId;
}

// 방 생성 함수
function createRoom(type = 'default') {
  const roomId = generateRoomId();
  const room = {
    id: roomId,
    type: type,
    createdAt: Date.now(),
    expiresAt: Date.now() + (24 * 60 * 60 * 1000), // 24시간 후 만료
    participants: new Map(),
    messages: [],
    votes: [],
    questions: [],
    notices: []
  };
  rooms.set(roomId, room);
  return room;
}

// REST API 엔드포인트
app.post("/api/rooms", (req, res) => {
  try {
    const room = createRoom(req.body.type);
    console.log('방 생성됨:', room.id);
    res.status(200).json({ 
      roomId: room.id,
      expiresAt: room.expiresAt,
      createdAt: room.createdAt
    });
  } catch (error) {
    console.error('방 생성 오류:', error);
    res.status(500).json({ error: "방 생성에 실패했습니다." });
  }
});

app.get("/api/rooms/:roomId", (req, res) => {
  try {
    const room = rooms.get(req.params.roomId);
    if (!room) {
      res.status(404).json({ error: "존재하지 않는 방입니다." });
      return;
    }
    
    res.status(200).json({ 
      id: room.id,
      participantCount: room.participants.size,
      createdAt: room.createdAt,
      expiresAt: room.expiresAt
    });
  } catch (error) {
    console.error('방 정보 조회 오류:', error);
    res.status(500).json({ error: "방 정보 조회에 실패했습니다." });
  }
});

// 방 정보 초기화 함수
function initializeRoom(roomId) {
  if (!rooms.has(roomId)) {
    rooms.set(roomId, {
      notices: [],
      votes: [],
      questions: [],
      participants: new Map()
    });
  }
  return rooms.get(roomId);
}

// 소켓 연결 처리
io.on("connection", (socket) => {
  console.log("새로운 클라이언트가 연결되었습니다.");
  let currentRoom = null;

  // 방 참가 처리
  socket.on("join_room", ({ roomId, nickname }) => {
    currentRoom = roomId;
    socket.join(roomId);
    
    // 방 정보 초기화 및 가져오기
    const room = initializeRoom(roomId);
    room.participants.set(socket.id, { 
      nickname, 
      isOnline: true 
    });

    // 방 정보 전송
    socket.emit("room_info", {
      notices: room.notices,
      votes: room.votes,
      questions: room.questions
    });

    // 참가자 목록 업데이트
    io.to(roomId).emit("participants_update", 
      Array.from(room.participants.entries()).map(([id, data]) => ({
        id,
        ...data
      }))
    );
  });

  // 공지사항 추가
  socket.on("add_notice", (notice) => {
    if (!currentRoom) return;
    
    const room = rooms.get(currentRoom);
    if (!room) return;

    const newNotice = {
      id: Date.now().toString(),
      content: notice.content,
      author: notice.author,
      createdAt: new Date().toISOString()
    };

    room.notices.push(newNotice);
    io.to(currentRoom).emit("notices_update", room.notices);
  });

  // 공지사항 삭제
  socket.on("delete_notice", (noticeId) => {
    if (!currentRoom) return;
    
    const room = rooms.get(currentRoom);
    if (!room) return;

    room.notices = room.notices.filter(notice => notice.id !== noticeId);
    io.to(currentRoom).emit("notices_update", room.notices);
  });

  // 투표 생성
  socket.on("create_vote", (voteData) => {
    if (!currentRoom) return;
    
    const room = rooms.get(currentRoom);
    if (!room) return;

    const newVote = {
      id: Date.now().toString(),
      title: voteData.title,
      options: voteData.options,
      results: new Array(voteData.options.length).fill(0),
      voters: [],
      author: voteData.author,
      isActive: true,
      createdAt: new Date().toISOString()
    };

    room.votes.push(newVote);
    io.to(currentRoom).emit("vote_data", room.votes);
  });

  // 투표 제출
  socket.on("submit_vote", ({ voteId, option }) => {
    if (!currentRoom) return;
    
    const room = rooms.get(currentRoom);
    if (!room) return;

    const vote = room.votes.find(v => v.id === voteId);
    if (!vote || !vote.isActive || vote.voters.includes(socket.id)) return;

    vote.results[option]++;
    vote.voters.push(socket.id);
    io.to(currentRoom).emit("vote_data", room.votes);
  });

  // 투표 종료
  socket.on("end_vote", (voteId) => {
    if (!currentRoom) return;
    
    const room = rooms.get(currentRoom);
    if (!room) return;

    const vote = room.votes.find(v => v.id === voteId);
    if (!vote || !vote.isActive) return;

    vote.isActive = false;
    vote.endedAt = new Date().toISOString();
    io.to(currentRoom).emit("vote_data", room.votes);
  });

  // 채팅 메시지 처리
  socket.on("chat message", (data) => {
    if (!currentRoom) return;
    
    const room = rooms.get(currentRoom);
    if (!room) return;

    const messageData = {
      id: Date.now().toString(),
      ...data,
      timestamp: new Date().toISOString()
    };

    room.messages.push(messageData);
    io.to(currentRoom).emit("chat message", messageData);
  });

  // 연결 해제 처리
  socket.on("disconnect", () => {
    if (currentRoom) {
      const room = rooms.get(currentRoom);
      if (room) {
        if (room.participants.size === 1) {
          // 마지막 참가자가 나가면 방 삭제
          rooms.delete(currentRoom);
        } else {
          // 참가자 상태 업데이트
          const participant = room.participants.get(socket.id);
          if (participant) {
            participant.isOnline = false;
            io.to(currentRoom).emit("participants_update", 
              Array.from(room.participants.entries()).map(([id, data]) => ({
                id,
                ...data
              }))
            );
          }
        }
      }
    }
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

