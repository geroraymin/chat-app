import React, { useEffect, useState, useRef } from "react";
import io from "socket.io-client";
import VoteDisplay from "./VoteDisplay";
import "./App.css";

const SOCKET_URL = "https://chat-app-n21i.onrender.com";
const socket = io(SOCKET_URL, {
  withCredentials: true,
  transports: ['websocket', 'polling']
});

function App() {
  const [nickname, setNickname] = useState("");
  const [entered, setEntered] = useState(false);
  const [inputMessage, setInputMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const [clientId, setClientId] = useState("");
  const [voteData, setVoteData] = useState([]);
  const [userVotes, setUserVotes] = useState({});
  const messagesEndRef = useRef(null);

  useEffect(() => {
    socket.on("connect", () => {
      setClientId(socket.id);
    });

    socket.on("chat message", (msg) => {
      setMessages((prev) => [...prev, msg]);
    });

    socket.on("vote data", (data) => {
      setVoteData(data);
    });

    socket.on("vote results", ({ voteId, results }) => {
      setVoteData((prev) =>
        prev.map((v) => (v.id === voteId ? { ...v, results } : v))
      );
    });

    socket.on("vote ended", (voteId) => {
      setVoteData((prev) =>
        prev.map((v) => (v.id === voteId ? { ...v, ended: true } : v))
      );
    });

    return () => {
      socket.off("connect");
      socket.off("chat message");
      socket.off("vote data");
      socket.off("vote results");
      socket.off("vote ended");
    };
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleEnter = () => {
    if (nickname.trim()) setEntered(true);
  };

  const handleSend = () => {
    if (!inputMessage.trim()) return;
    socket.emit("chat message", {
      senderId: clientId,
      nickname,
      message: inputMessage,
    });
    setInputMessage("");
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      if (!entered) {
        handleEnter();
      } else {
        handleSend();
      }
    }
  };

  return (
    <div className="container">
      {!entered ? (
        <div className="nickname-container">
          <h2>닉네임을 입력하세요</h2>
          <input
            type="text"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="닉네임 입력"
          />
          <button onClick={handleEnter}>입장</button>
        </div>
      ) : (
        <>
          <div className="chat-section">
            <h2>💬 실시간 채팅</h2>
            <div className="chat-box">
              {messages.map((msg, i) => (
                <div
                  key={i}
                  className={`chat-message-wrapper ${
                    msg.senderId === clientId ? "me" : "others"
                  }`}
                >
                  <div className="chat-bubble">
                    <strong>{msg.nickname}:</strong> {msg.message}
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
            <div className="input-area">
              <input
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="메시지를 입력하세요..."
              />
              <button onClick={handleSend}>보내기</button>
            </div>
          </div>

          <VoteDisplay
            voteData={voteData}
            socket={socket}
            nickname={nickname}
            userVotes={userVotes}
            setUserVotes={setUserVotes}
          />
        </>
      )}
    </div>
  );
}

export default App;
