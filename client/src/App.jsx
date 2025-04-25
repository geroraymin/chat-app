import React, { useEffect, useState, useRef, useCallback, useMemo } from "react";
import VoteDisplay from "./VoteDisplay";
import QuestionManager from "./QuestionManager";
import VoteCreator from "./VoteCreator";
import ParticipantManager from "./ParticipantManager";
import { socket } from "./socket";
import "./App.css";

// 관리자 상수 정의
const ADMIN_ID = "관리자";
const ADMIN_PASSWORD = "0627";

function App() {
  // 로그인 관련 상태
  const [nickname, setNickname] = useState("");
  const [isAdminLogin, setIsAdminLogin] = useState(false);
  const [adminPassword, setAdminPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [entered, setEntered] = useState(false);
  
  // 채팅 관련 상태
  const [inputMessage, setInputMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const [clientId, setClientId] = useState("");
  const messagesEndRef = useRef(null);

  // 사이드 패널 관련 상태
  const [showSidePanel, setShowSidePanel] = useState(false);
  const [activeTool, setActiveTool] = useState(null);
  
  // 참가자/공지사항 관련 상태
  const [participants, setParticipants] = useState([]);
  const [notices, setNotices] = useState([]);
  const [newNotice, setNewNotice] = useState("");

  // 투표 관련 상태
  const [voteData, setVoteData] = useState([]);
  const [userVotes, setUserVotes] = useState({});

  const isAdmin = nickname === ADMIN_ID;

  // 메모이제이션된 도구 목록
  const adminTools = useMemo(() => [
    { id: 'participants', name: '참가자 관리', icon: '👥', adminOnly: true },
    { id: 'questions', name: '질문 관리', icon: '❓', adminOnly: true },
    { id: 'notice', name: '공지관리', icon: '📢', adminOnly: true },
    { id: 'vote-create', name: '투표 만들기', icon: '✏️', adminOnly: true },
    { id: 'vote', name: '투표', icon: '📊', adminOnly: false }
  ], []);

  const userTools = useMemo(() => [
    { id: 'question', name: '질문하기', icon: '❓', adminOnly: false },
    { id: 'vote', name: '투표', icon: '📊', adminOnly: false }
  ], []);

  // 콜백 함수 메모이제이션
  const handleEnter = useCallback(() => {
    if (!nickname.trim()) {
      setPasswordError("닉네임을 입력해주세요.");
      return;
    }

    if (isAdminLogin) {
      if (nickname !== ADMIN_ID) {
        setPasswordError("관리자 아이디가 올바르지 않습니다.");
        return;
      }
      if (adminPassword !== ADMIN_PASSWORD) {
        setPasswordError("비밀번호가 일치하지 않습니다.");
        return;
      }
    }

    setEntered(true);
    setPasswordError("");
    console.log('Logged in as:', { nickname, isAdmin: isAdminLogin });
  }, [nickname, isAdminLogin, adminPassword]);

  const handleSend = useCallback(() => {
    if (!inputMessage.trim()) return;
    socket.emit("chat message", {
      senderId: clientId,
      nickname,
      message: inputMessage,
    });
    setInputMessage("");
  }, [inputMessage, clientId, nickname]);

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      if (!entered) {
        handleEnter();
      } else {
        handleSend();
      }
    }
  };

  const handleSubmitNotice = useCallback(() => {
    if (!newNotice.trim()) return;
    socket.emit("add_notice", {
      text: newNotice,
      timestamp: new Date().toISOString(),
      author: nickname
    });
    setNewNotice("");
  }, [newNotice, nickname]);

  const handleDeleteNotice = useCallback((noticeId) => {
    socket.emit("delete_notice", noticeId);
  }, []);

  // 소켓 이벤트 리스너 최적화
  useEffect(() => {
    const handleConnect = () => {
      console.log("Socket connected:", socket.id);
      setClientId(socket.id);
      socket.emit("participant_join", { 
        nickname, 
        id: socket.id, 
        isAdmin 
      });
    };

    const handleParticipantsUpdate = (updatedParticipants) => {
      console.log('Participants updated:', updatedParticipants);
      setParticipants(updatedParticipants);
    };

    const handleChatMessage = (msg) => {
      setMessages((prev) => [...prev, msg]);
    };

    const handleNoticesUpdate = (updatedNotices) => {
      console.log('Notices updated:', updatedNotices);
      setNotices(updatedNotices);
    };

    const handleVoteData = (data) => {
      console.log('Vote data received:', data);
      setVoteData(data);
    };

    const handleVoteResults = ({ voteId, results }) => {
      setVoteData((prev) =>
        prev.map((v) => (v.id === voteId ? { ...v, results } : v))
      );
    };

    const handleVoteEnded = (voteId) => {
      setVoteData((prev) =>
        prev.map((v) => (v.id === voteId ? { ...v, ended: true } : v))
      );
    };

    socket.on("connect", handleConnect);
    socket.on("participants_update", handleParticipantsUpdate);
    socket.on("chat message", handleChatMessage);
    socket.on("notices_update", handleNoticesUpdate);
    socket.on("vote data", handleVoteData);
    socket.on("vote results", handleVoteResults);
    socket.on("vote ended", handleVoteEnded);

    return () => {
      socket.off("connect", handleConnect);
      socket.off("participants_update", handleParticipantsUpdate);
      socket.off("chat message", handleChatMessage);
      socket.off("notices_update", handleNoticesUpdate);
      socket.off("vote data", handleVoteData);
      socket.off("vote results", handleVoteResults);
      socket.off("vote ended", handleVoteEnded);
    };
  }, [nickname, isAdmin]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const renderTool = () => {
    switch(activeTool) {
      case 'participants':
        return (
          <ParticipantManager 
            participants={participants}
          />
        );
      case 'questions':
      case 'question':
        return (
          <QuestionManager 
            nickname={nickname} 
            isInstructor={isAdmin}
          />
        );
      case 'notice':
        return (
          <div style={{ padding: '20px' }}>
            <h3 style={{ marginBottom: '16px' }}>공지사항 관리</h3>
            <div style={{ marginBottom: '20px' }}>
              <textarea
                value={newNotice}
                onChange={(e) => setNewNotice(e.target.value)}
                placeholder="새 공지사항을 입력하세요..."
                style={{
                  width: '100%',
                  minHeight: '100px',
                  padding: '12px',
                  borderRadius: '8px',
                  border: '1px solid #e1e1e1',
                  marginBottom: '12px',
                  resize: 'vertical'
                }}
              />
              <button
                onClick={handleSubmitNotice}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#4a90e2',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer'
                }}
              >
                공지 등록
              </button>
            </div>
            <div>
              <h4 style={{ marginBottom: '12px' }}>등록된 공지사항</h4>
              {notices.map((notice) => (
                <div
                  key={notice.id}
                  style={{
                    padding: '12px',
                    backgroundColor: '#f8f9fa',
                    borderRadius: '8px',
                    marginBottom: '8px',
                    border: '1px solid #e1e1e1'
                  }}
                >
                  <div style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between',
                    marginBottom: '8px'
                  }}>
                    <span>{notice.text}</span>
                    <button
                      onClick={() => handleDeleteNotice(notice.id)}
                      style={{
                        padding: '4px 8px',
                        backgroundColor: '#dc3545',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer'
                      }}
                    >
                      삭제
                    </button>
                  </div>
                  <div style={{ fontSize: '12px', color: '#666' }}>
                    {new Date(notice.timestamp).toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      case 'vote':
        return (
          <VoteDisplay
            isAdmin={isAdmin}
            nickname={nickname}
            voteData={voteData}
            userVotes={userVotes}
            onVote={(voteId, option) => {
              socket.emit("submit_vote", { voteId, option });
              setUserVotes(prev => ({ ...prev, [voteId]: option }));
            }}
            onEndVote={(voteId) => {
              socket.emit("end_vote", voteId);
            }}
          />
        );
      case 'vote-create':
        return (
          <VoteCreator
            onClose={() => setActiveTool('vote')}
            onSubmit={(title, options) => {
              socket.emit("create_vote", { title, options });
              setActiveTool('vote');
            }}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="container">
      {!entered ? (
        <div className="nickname-container">
          <h2>로그인</h2>
          <div className="login-form">
            <div className="input-group">
              <input
                type="text"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="닉네임 입력"
                id="nickname-input"
                name="nickname"
              />
            </div>
            
            <div className="admin-login-option">
              <label>
                <input
                  type="checkbox"
                  checked={isAdminLogin}
                  onChange={(e) => setIsAdminLogin(e.target.checked)}
                /> 관리자로 로그인
              </label>
            </div>

            {isAdminLogin && (
              <div className="input-group">
                <input
                  type="password"
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="관리자 비밀번호"
                  id="password-input"
                  name="password"
                />
              </div>
            )}

            {passwordError && (
              <div className="error-message">
                {passwordError}
              </div>
            )}

            <button onClick={handleEnter}>입장</button>
          </div>
        </div>
      ) : (
        <div style={{ 
          display: 'flex', 
          width: '100%',
          maxWidth: '1200px',
          margin: '0 auto',
          gap: '20px',
          position: 'relative',
          height: '90vh'
        }}>
          {/* 채팅 섹션 */}
          <div style={{ 
            flex: '1',
            display: 'flex',
            flexDirection: 'column',
            backgroundColor: '#fff',
            borderRadius: '12px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
            overflow: 'hidden'
          }}>
            {/* 공지사항 */}
            {notices.length > 0 && (
              <div style={{
                padding: '12px 20px',
                backgroundColor: '#fff3e0',
                borderBottom: '1px solid #ffe0b2',
                display: 'flex',
                alignItems: 'center',
                gap: '12px'
              }}>
                <span style={{ fontSize: '20px' }}>📢</span>
                <div style={{ flex: 1 }}>
                  <div style={{ 
                    fontSize: '14px',
                    color: '#e65100',
                    fontWeight: '500'
                  }}>
                    {notices[0].text}
                  </div>
                  <div style={{ 
                    fontSize: '12px',
                    color: '#bf360c',
                    marginTop: '4px'
                  }}>
                    {new Date(notices[0].timestamp).toLocaleString()}
                  </div>
                </div>
                {isAdmin && (
                  <button
                    onClick={() => setActiveTool('notice')}
                    style={{
                      padding: '4px 8px',
                      backgroundColor: 'transparent',
                      border: '1px solid #e65100',
                      color: '#e65100',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '12px'
                    }}
                  >
                    관리
                  </button>
                )}
              </div>
            )}

            {/* 참여자 목록 */}
            <div style={{
              padding: '12px 20px',
              borderBottom: '1px solid #e1e1e1',
              backgroundColor: '#f8f9fa'
            }}>
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'space-between',
                marginBottom: '8px'
              }}>
                <span style={{ 
                  fontSize: '14px', 
                  color: '#2c3e50',
                  fontWeight: '600'
                }}>
                  참여자 ({participants.length})
                </span>
              </div>
              <div style={{ 
                display: 'flex', 
                flexWrap: 'wrap', 
                gap: '8px' 
              }}>
                {participants.map((participant) => (
                  <div
                    key={participant.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '4px 10px',
                      backgroundColor: 'white',
                      borderRadius: '12px',
                      fontSize: '13px',
                      border: '1px solid #e1e1e1'
                    }}
                  >
                    <span style={{
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      backgroundColor: participant.nickname === "강사" ? '#4caf50' : '#2196f3'
                    }}></span>
                    <span style={{
                      color: participant.nickname === "강사" ? '#2c3e50' : '#37474f',
                      fontWeight: participant.nickname === "강사" ? '600' : '400'
                    }}>
                      {participant.nickname}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="chat-section" style={{ 
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              padding: '20px'
            }}>
              <h2 style={{ margin: '0 0 16px 0' }}>💬 실시간 채팅</h2>
              <div className="chat-box" style={{ flex: 1, overflowY: 'auto' }}>
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
              <div className="input-area" style={{ 
                marginTop: '16px',
                display: 'flex',
                gap: '8px'
              }}>
                <button 
                  onClick={() => setShowSidePanel(!showSidePanel)}
                  style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '20px',
                    border: 'none',
                    backgroundColor: '#f0f2f5',
                    cursor: 'pointer',
                    fontSize: '20px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.2s ease'
                  }}
                >
                  {showSidePanel ? '✕' : '+'}
                </button>
                <input
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="메시지를 입력하세요..."
                  style={{
                    flex: 1,
                    padding: '8px 16px',
                    borderRadius: '20px',
                    border: '1px solid #e1e1e1',
                    fontSize: '15px'
                  }}
                />
                <button 
                  onClick={handleSend}
                  style={{
                    padding: '8px 20px',
                    borderRadius: '20px',
                    border: 'none',
                    backgroundColor: '#4a90e2',
                    color: 'white',
                    cursor: 'pointer',
                    fontSize: '15px'
                  }}
                >
                  보내기
                </button>
              </div>
            </div>
          </div>

          {/* 사이드 패널 */}
          {showSidePanel && (
            <div style={{
              width: '300px',
              backgroundColor: '#fff',
              borderRadius: '12px',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
              overflow: 'hidden',
              animation: 'slideIn 0.3s ease'
            }}>
              {!activeTool ? (
                <div style={{ padding: '20px' }}>
                  <h3 style={{ 
                    margin: '0 0 16px 0',
                    fontSize: '18px',
                    color: '#2c3e50'
                  }}>
                    {isAdmin ? '관리자 메뉴' : '메뉴'}
                  </h3>
                  <div style={{ 
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px'
                  }}>
                    {(isAdmin ? adminTools : userTools).map(tool => (
                      <button
                        key={tool.id}
                        onClick={() => setActiveTool(tool.id)}
                        style={{
                          padding: '12px',
                          border: 'none',
                          borderRadius: '8px',
                          backgroundColor: tool.adminOnly ? '#e3f2fd' : '#f0f2f5',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          fontSize: '15px',
                          color: tool.adminOnly ? '#1976d2' : '#2c3e50',
                          transition: 'all 0.2s ease',
                          ':hover': {
                            backgroundColor: tool.adminOnly ? '#bbdefb' : '#e4e6e9'
                          }
                        }}
                      >
                        <span style={{ fontSize: '20px' }}>{tool.icon}</span>
                        {tool.name}
                        {tool.adminOnly && (
                          <span style={{
                            marginLeft: 'auto',
                            fontSize: '12px',
                            padding: '2px 6px',
                            backgroundColor: '#2196f3',
                            color: 'white',
                            borderRadius: '4px'
                          }}>
                            관리자
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div style={{ height: '100%' }}>
                  <div style={{
                    padding: '12px 20px',
                    borderBottom: '1px solid #e1e1e1',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}>
                    <button
                      onClick={() => setActiveTool(null)}
                      style={{
                        border: 'none',
                        background: 'none',
                        cursor: 'pointer',
                        padding: '4px',
                        fontSize: '20px'
                      }}
                    >
                      ←
                    </button>
                    <h3 style={{ 
                      margin: 0,
                      fontSize: '16px',
                      color: '#2c3e50'
                    }}>
                      {(isAdmin ? adminTools : userTools).find(t => t.id === activeTool)?.name}
                    </h3>
                  </div>
                  <div style={{ 
                    height: 'calc(100% - 53px)',
                    overflow: 'auto'
                  }}>
                    {renderTool()}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default App;
