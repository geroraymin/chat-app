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

// 에러 메시지 상수
const ERROR_MESSAGES = {
  NICKNAME_REQUIRED: "닉네임을 입력해주세요.",
  ADMIN_ID_INVALID: "관리자 아이디가 올바르지 않습니다.",
  ADMIN_PASSWORD_INVALID: "비밀번호가 일치하지 않습니다.",
  ROOM_ID_REQUIRED: "방 ID를 입력해주세요.",
  ROOM_CREATE_FAILED: "방 생성에 실패했습니다.",
  ROOM_JOIN_FAILED: "방 참가에 실패했습니다.",
  ROOM_EXPIRED: "방이 만료되었습니다. 새로운 방에 참가해주세요.",
  NETWORK_ERROR: "네트워크 오류가 발생했습니다. 다시 시도해주세요."
};

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
  const [voteTitle, setVoteTitle] = useState("");
  const [voteOptions, setVoteOptions] = useState(["", ""]);

  const [roomId, setRoomId] = useState(null);
  const [isCreatingRoom, setIsCreatingRoom] = useState(false);
  const [isJoiningRoom, setIsJoiningRoom] = useState(false);
  const [joinRoomId, setJoinRoomId] = useState("");
  const [createdRoomId, setCreatedRoomId] = useState(null);

  const isAdmin = nickname === ADMIN_ID;

  // 에러 상태 추가
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  // 채팅 금지 상태
  const [isMuted, setIsMuted] = useState(false);

  // 메모이제이션된 도구 목록
  const tools = useMemo(() => {
    const baseTools = [
      { id: 'vote', name: '투표', icon: '📊', adminOnly: false }
    ];

    const userTools = [
      { id: 'question', name: '질문하기', icon: '❓', adminOnly: false },
      ...baseTools
    ];

    const adminTools = [
      { id: 'participants', name: '참가자 관리', icon: '👥', adminOnly: true },
      { id: 'questions', name: '질문 관리', icon: '❓', adminOnly: true },
      { id: 'notice', name: '공지관리', icon: '📢', adminOnly: true },
      { id: 'vote-create', name: '투표 만들기', icon: '✏️', adminOnly: true },
      ...baseTools
    ];

    return isAdmin ? adminTools : userTools;
  }, [isAdmin]);

  // 콜백 함수 메모이제이션
  const handleEnter = useCallback(() => {
    setError(null);

    if (!nickname.trim()) {
      setError(ERROR_MESSAGES.NICKNAME_REQUIRED);
      return;
    }

    if (isAdminLogin) {
      if (nickname !== ADMIN_ID) {
        setError(ERROR_MESSAGES.ADMIN_ID_INVALID);
        return;
      }
      if (adminPassword !== ADMIN_PASSWORD) {
        setError(ERROR_MESSAGES.ADMIN_PASSWORD_INVALID);
        return;
      }
    }

    setEntered(true);
    console.log('Logged in as:', { nickname, isAdmin: isAdminLogin });
  }, [nickname, isAdminLogin, adminPassword]);

  const handleCreateRoom = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await fetch("http://localhost:3001/api/rooms", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ type: "default" })
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || ERROR_MESSAGES.ROOM_CREATE_FAILED);
      }

      if (!data || !data.roomId) {
        throw new Error(ERROR_MESSAGES.ROOM_CREATE_FAILED);
      }

      console.log("방 생성 성공:", data.roomId);
      
      // 방 생성 성공 후 바로 입장하지 않고, 방번호를 보여줌
      setCreatedRoomId(data.roomId);
    } catch (error) {
      console.error("방 생성 실패:", error);
      if (error.message === "Failed to fetch") {
        setError("서버가 실행중인지 확인해주세요. (포트: 3001)");
      } else {
        setError(error.message || ERROR_MESSAGES.ROOM_CREATE_FAILED);
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  // 방 입장 처리 함수 분리
  const enterRoom = useCallback((roomId) => {
    setRoomId(roomId);
    setIsCreatingRoom(false);
    setCreatedRoomId(null);
  }, []);

  const handleJoinRoom = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      if (!joinRoomId.trim()) {
        setError(ERROR_MESSAGES.ROOM_ID_REQUIRED);
        return;
      }

      const response = await fetch(`http://localhost:3001/api/rooms/${joinRoomId.trim()}`);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || ERROR_MESSAGES.ROOM_JOIN_FAILED);
      }

      setRoomId(joinRoomId.trim());
      setIsJoiningRoom(false);
      console.log("방 입장:", joinRoomId.trim());
    } catch (error) {
      console.error("방 입장 실패:", error);
      if (error.message === "Failed to fetch") {
        setError("서버가 실행중인지 확인해주세요. (포트: 3001)");
      } else {
        setError(error.message || ERROR_MESSAGES.ROOM_JOIN_FAILED);
      }
    } finally {
      setIsLoading(false);
    }
  }, [joinRoomId]);

  const handleSend = useCallback(() => {
    if (!inputMessage.trim()) return;
    
    try {
      socket.emit("chat message", {
        senderId: clientId,
        nickname,
        message: inputMessage,
      });
      setInputMessage("");
    } catch (error) {
      console.error("메시지 전송 실패:", error);
      setError(ERROR_MESSAGES.NETWORK_ERROR);
    }
  }, [inputMessage, clientId, nickname]);

  const handleSubmitNotice = useCallback((noticeText) => {
    if (!socket || !roomId || !noticeText.trim()) return;
    
    socket.emit("add_notice", {
      content: noticeText.trim(),
      author: nickname
    });
  }, [socket, roomId, nickname]);

  const handleDeleteNotice = useCallback((noticeId) => {
    if (!socket || !roomId) return;
    
    socket.emit("delete_notice", noticeId);
  }, [socket, roomId]);

  // 소켓 이벤트 리스너 최적화
  useEffect(() => {
    const handleConnect = () => {
      console.log("Socket connected:", socket.id);
      setClientId(socket.id);
      setError(null);
    };

    const handleError = (errorMessage) => {
      console.error("Socket error:", errorMessage);
      setError(errorMessage);
    };

    const handleDisconnect = (reason) => {
      console.log("Socket disconnected:", reason);
      if (reason === "io server disconnect") {
        socket.connect();
      }
      setError("서버와의 연결이 끊어졌습니다.");
    };

    socket.on("connect", handleConnect);
    socket.on("error", handleError);
    socket.on("disconnect", handleDisconnect);
    socket.on("connect_error", () => setError(ERROR_MESSAGES.NETWORK_ERROR));

    return () => {
      socket.off("connect", handleConnect);
      socket.off("error", handleError);
      socket.off("disconnect", handleDisconnect);
      socket.off("connect_error");
    };
  }, []);

  // 방 관련 이벤트 리스너
  useEffect(() => {
    if (entered && roomId) {
      console.log("Joining room:", roomId);
      setError(null);
      
      socket.emit("join_room", { 
        roomId,
        nickname, 
        isAdmin: nickname === ADMIN_ID 
      });

      const handleRoomInfo = (roomData) => {
        console.log("Room info received:", roomData);
        setMessages(roomData.messages || []);
        setVoteData(roomData.votes || []);
        setParticipants(roomData.participants || []);
        setNotices(roomData.notices || []);
        setError(null);
      };

      const handleRoomExpired = () => {
        setError(ERROR_MESSAGES.ROOM_EXPIRED);
        setEntered(false);
        setRoomId(null);
      };

      socket.on("room_info", handleRoomInfo);
      socket.on("room_expired", handleRoomExpired);

      return () => {
        socket.off("room_info", handleRoomInfo);
        socket.off("room_expired", handleRoomExpired);
      };
    }
  }, [entered, roomId, nickname]);

  // 자동 스크롤
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  // 소켓 이벤트 리스너 설정
  useEffect(() => {
    if (!socket || !roomId) return;

    // 참여자 목록 업데이트 리스너
    socket.on("participants_update", (updatedParticipants) => {
      console.log("참여자 목록 업데이트:", updatedParticipants);
      setParticipants(updatedParticipants);
    });

    // 채팅 메시지 수신 리스너
    socket.on("chat message", (message) => {
      console.log("채팅 메시지 수신:", message);
      setMessages(prev => [...prev, message]);
    });

    // 공지사항 업데이트 리스너
    socket.on("notices_update", (updatedNotices) => {
      console.log("공지사항 업데이트:", updatedNotices);
      setNotices(updatedNotices);
    });

    // 투표 데이터 업데이트 리스너
    socket.on("vote_data", (updatedVotes) => {
      console.log("투표 데이터 업데이트:", updatedVotes);
      setVoteData(updatedVotes);
    });

    // 질문 업데이트 리스너
    socket.on("questions_update", (updatedQuestions) => {
      console.log("질문 업데이트:", updatedQuestions);
      setVoteData(prev => prev.map(vote =>
        updatedQuestions.find(q => q.id === vote.id) ? { ...vote, ...updatedQuestions.find(q => q.id === vote.id) } : vote
      ));
    });

    // 방 정보 수신 리스너
    socket.on("room_info", (roomInfo) => {
      console.log("방 정보 수신:", roomInfo);
      setNotices(roomInfo.notices || []);
      setVoteData(roomInfo.votes || []);
    });

    socket.on("mute_status", (mutedStatus) => {
      setIsMuted(mutedStatus);
      const message = mutedStatus 
        ? "관리자가 채팅을 금지했습니다." 
        : "관리자가 채팅을 허용했습니다.";
      setMessages(prev => [...prev, {
        id: Date.now(),
        type: 'system',
        message,
        timestamp: new Date().toISOString()
      }]);
    });

    // 시스템 메시지 리스너 추가
    socket.on("system_message", (data) => {
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        type: 'system',
        message: data.message,
        timestamp: new Date().toISOString()
      }]);
    });

    return () => {
      socket.off("participants_update");
      socket.off("chat message");
      socket.off("notices_update");
      socket.off("vote_data");
      socket.off("questions_update");
      socket.off("room_info");
      socket.off("mute_status");
      socket.off("system_message");
    };
  }, [socket, roomId]);

  // 투표 생성 함수
  const handleCreateVote = useCallback((voteData) => {
    if (!socket || !roomId) return;
    
    socket.emit("create_vote", {
      ...voteData,
      author: nickname
    });
  }, [socket, roomId, nickname]);

  // 투표 제출 함수
  const handleSubmitVote = useCallback((voteId, option) => {
    if (!socket || !roomId) return;
    
    socket.emit("submit_vote", {
      voteId,
      option
    });
  }, [socket, roomId]);

  // 투표 종료 함수
  const handleEndVote = useCallback((voteId) => {
    if (!socket || !roomId) return;
    
    socket.emit("end_vote", voteId);
  }, [socket, roomId]);

  const renderTool = useCallback(() => {
    switch (activeTool) {
      case 'notice':
        return (
          <div className="tool-container">
            {isAdmin && (
              <div className="notice-form">
                <textarea
                  placeholder="공지사항을 입력하세요..."
                  value={newNotice}
                  onChange={(e) => setNewNotice(e.target.value)}
                />
                <button 
                  onClick={() => {
                    handleSubmitNotice(newNotice);
                    setNewNotice('');
                  }}
                  disabled={!newNotice.trim()}
                >
                  공지하기
                </button>
              </div>
            )}
            <div className="notices-list">
              {notices.map((notice) => (
                <div key={notice.id} className="notice-item">
                  <p>{notice.content}</p>
                  <small>
                    {new Date(notice.createdAt).toLocaleString()} - {notice.author}
                  </small>
                  {isAdmin && (
                    <button onClick={() => handleDeleteNotice(notice.id)}>
                      삭제
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        );

      case 'vote-create':
        return isAdmin ? (
          <div className="tool-container">
            <div className="vote-form">
              <input
                type="text"
                placeholder="투표 제목"
                value={voteTitle}
                onChange={(e) => setVoteTitle(e.target.value)}
              />
              <div className="vote-options">
                {voteOptions.map((option, index) => (
                  <div key={index} className="vote-option">
                    <input
                      type="text"
                      value={option}
                      onChange={(e) => {
                        const newOptions = [...voteOptions];
                        newOptions[index] = e.target.value;
                        setVoteOptions(newOptions);
                      }}
                      placeholder={`선택지 ${index + 1}`}
                    />
                  </div>
                ))}
                <button onClick={() => setVoteOptions([...voteOptions, ''])}>
                  선택지 추가
                </button>
              </div>
              <button
                onClick={() => {
                  handleCreateVote({
                    title: voteTitle,
                    options: voteOptions.filter(opt => opt.trim())
                  });
                  setVoteTitle('');
                  setVoteOptions(['', '']);
                }}
                disabled={!voteTitle.trim() || voteOptions.filter(opt => opt.trim()).length < 2}
              >
                투표 생성
              </button>
            </div>
          </div>
        ) : null;

      case 'vote':
        return (
          <div className="tool-container">
            <div className="votes-list">
              {voteData.map((vote) => (
                <div key={vote.id} className="vote-item">
                  <h3>{vote.title}</h3>
                  <div className="vote-options">
                    {vote.options.map((option, index) => {
                      const percentage = vote.results[index] > 0
                        ? (vote.results[index] / vote.voters.length) * 100
                        : 0;
                      
                      return (
                        <div key={index} className="vote-option">
                          <button
                            onClick={() => handleSubmitVote(vote.id, index)}
                            disabled={!vote.isActive || vote.voters.includes(socket.id)}
                          >
                            {option}
                          </button>
                          <div className="vote-result">
                            <div 
                              className="vote-bar"
                              style={{ width: `${percentage}%` }}
                            />
                            <span>{vote.results[index]} 표 ({percentage.toFixed(1)}%)</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  {isAdmin && vote.isActive && (
                    <button onClick={() => handleEndVote(vote.id)}>
                      투표 종료
                    </button>
                  )}
                  <small>
                    {vote.isActive ? '진행중' : '종료됨'} - 
                    생성: {new Date(vote.createdAt).toLocaleString()}
                    {vote.endedAt && ` - 종료: ${new Date(vote.endedAt).toLocaleString()}`}
                  </small>
                </div>
              ))}
            </div>
          </div>
        );

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
      default:
        return null;
    }
  }, [activeTool, isAdmin, notices, voteData, newNotice, voteTitle, voteOptions, 
      handleSubmitNotice, handleDeleteNotice, handleCreateVote, handleSubmitVote, handleEndVote]);

  // 에러 메시지 표시
  const renderError = () => {
    if (!error) return null;
    
    return (
      <div className="error-banner">
        <span className="error-icon">⚠️</span>
        <span className="error-message">{error}</span>
        <button 
          className="error-close"
          onClick={() => setError(null)}
        >
          ✕
        </button>
      </div>
    );
  };

  // handleKeyDown 함수 추가
  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      if (!entered) {
        handleEnter();
      } else if (roomId) {
        handleSend();
      }
    }
  };

  if (!entered) {
    return (
      <div className="login-container">
        <div className="login-box">
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

            {error && (
              <div className="error-message">
                {error}
              </div>
            )}

            <button onClick={handleEnter} className="login-button">
              입장하기
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!roomId) {
    return (
      <div className="room-selection">
        <h2>방 선택</h2>
        {!isCreatingRoom && !isJoiningRoom ? (
          <div className="room-buttons">
            <button 
              onClick={() => setIsCreatingRoom(true)}
              className="button button-primary"
              disabled={isLoading}
            >
              새로운 방 만들기
            </button>
            <button 
              onClick={() => setIsJoiningRoom(true)}
              className="button button-secondary"
              disabled={isLoading}
            >
              기존 방 참가하기
            </button>
          </div>
        ) : isCreatingRoom ? (
          <div className="create-room">
            {createdRoomId ? (
              <div className="room-created-info">
                <h3>방이 생성되었습니다!</h3>
                <div className="room-id-display">
                  <p>방 번호: <strong>{createdRoomId}</strong></p>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(createdRoomId);
                      alert('방 번호가 복사되었습니다!');
                    }}
                    className="button button-secondary"
                  >
                    방 번호 복사
                  </button>
                </div>
                <div className="button-group">
                  <button 
                    onClick={() => enterRoom(createdRoomId)}
                    className="button button-primary"
                  >
                    입장하기
                  </button>
                  <button 
                    onClick={() => {
                      setCreatedRoomId(null);
                      setIsCreatingRoom(false);
                    }}
                    className="button button-secondary"
                  >
                    취소
                  </button>
                </div>
              </div>
            ) : (
              <>
                <p>새로운 방을 만드시겠습니까?</p>
                <div className="button-group">
                  <button 
                    onClick={handleCreateRoom}
                    className="button button-primary"
                    disabled={isLoading}
                  >
                    {isLoading ? "생성중..." : "방 만들기"}
                  </button>
                  <button 
                    onClick={() => setIsCreatingRoom(false)}
                    className="button button-secondary"
                    disabled={isLoading}
                  >
                    취소
                  </button>
                </div>
              </>
            )}
            {error && <div className="error-message">{error}</div>}
          </div>
        ) : (
          <div className="join-room">
            <div className="input-group">
              <input
                type="text"
                value={joinRoomId}
                onChange={(e) => setJoinRoomId(e.target.value)}
                placeholder="방 ID 입력"
                disabled={isLoading}
              />
            </div>
            <div className="button-group">
              <button 
                onClick={handleJoinRoom}
                className="button button-primary"
                disabled={isLoading}
              >
                {isLoading ? "입장중..." : "참가하기"}
              </button>
              <button 
                onClick={() => setIsJoiningRoom(false)}
                className="button button-secondary"
                disabled={isLoading}
              >
                취소
              </button>
            </div>
            {error && <div className="error-message">{error}</div>}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="container">
      {renderError()}
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
                  {notices[notices.length - 1].content}
                </div>
                <div style={{ 
                  fontSize: '12px',
                  color: '#bf360c',
                  marginTop: '4px'
                }}>
                  {new Date(notices[notices.length - 1].createdAt).toLocaleString()} - {notices[notices.length - 1].author}
                </div>
              </div>
              {isAdmin && (
                <button
                  onClick={() => {
                    setShowSidePanel(true);
                    setActiveTool('notice');
                  }}
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
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '16px'
            }}>
              <h2 style={{ margin: 0 }}>💬 실시간 채팅</h2>
              <button
                onClick={() => setShowSidePanel(!showSidePanel)}
                style={{
                  padding: '8px',
                  backgroundColor: '#f0f2f5',
                  border: 'none',
                  borderRadius: '50%',
                  cursor: 'pointer',
                  width: '32px',
                  height: '32px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '20px'
                }}
              >
                {showSidePanel ? '×' : '≡'}
              </button>
            </div>
            <div className="chat-box" style={{ 
              flex: 1, 
              overflowY: 'auto',
              padding: '10px'
            }}>
              {messages.map((msg, i) => (
                <div
                  key={i}
                  style={{
                    display: 'flex',
                    justifyContent: msg.type === 'system' ? 'center' : msg.senderId === clientId ? 'flex-end' : 'flex-start',
                    margin: '8px 0',
                    position: 'relative'
                  }}
                >
                  {msg.type === 'system' ? (
                    <div
                      style={{
                        backgroundColor: '#f8f9fa',
                        padding: '8px 16px',
                        borderRadius: '15px',
                        color: '#666',
                        fontSize: '0.9em',
                        maxWidth: '80%',
                        textAlign: 'center'
                      }}
                    >
                      {msg.message}
                    </div>
                  ) : (
                    <div
                      style={{
                        maxWidth: '70%',
                        padding: '8px 12px',
                        borderRadius: msg.senderId === clientId ? '15px 15px 0 15px' : '15px 15px 15px 0',
                        backgroundColor: msg.senderId === clientId ? '#007bff' : '#e9ecef',
                        color: msg.senderId === clientId ? 'white' : 'black',
                        position: 'relative'
                      }}
                    >
                      <div style={{ 
                        fontWeight: 'bold', 
                        fontSize: '0.9em',
                        marginBottom: '4px',
                        color: msg.senderId === clientId ? '#fff' : '#666'
                      }}>
                        {msg.nickname}
                      </div>
                      <div style={{ wordBreak: 'break-word' }}>
                        {msg.message}
                      </div>
                    </div>
                  )}
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
            <div className="input-area">
              <input
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={isMuted ? "채팅이 금지되었습니다" : "메시지를 입력하세요..."}
                disabled={isMuted}
                style={{
                  flex: 1,
                  padding: '8px 16px',
                  borderRadius: '20px',
                  border: '1px solid #e1e1e1',
                  fontSize: '15px',
                  backgroundColor: isMuted ? '#f5f5f5' : 'white'
                }}
              />
              <button
                onClick={handleSend}
                disabled={isMuted}
                style={{
                  padding: '8px 20px',
                  borderRadius: '20px',
                  border: 'none',
                  backgroundColor: isMuted ? '#cccccc' : '#4a90e2',
                  color: 'white',
                  cursor: isMuted ? 'not-allowed' : 'pointer',
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
                  {tools.map(tool => (
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
                    {tools.find(t => t.id === activeTool)?.name}
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
    </div>
  );
}

export default App;
