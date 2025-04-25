import React from 'react';
import { socket } from './socket';
import './ParticipantManager.css';

const ParticipantManager = ({ participants }) => {
  const handleBanUser = (userId) => {
    if (window.confirm('정말 이 사용자를 강퇴하시겠습니까?')) {
      socket.emit('ban_user', userId);
    }
  };

  const handleToggleMute = (userId, isMuted) => {
    socket.emit('toggle_mute', { userId, isMuted: !isMuted });
  };

  return (
    <div className="participant-manager">
      <h3>참가자 관리</h3>
      <div className="participants-list">
        {participants.map((participant) => (
          <div key={participant.id} className="participant-item">
            <div className="participant-info">
              <span className={`status-dot ${participant.isOnline ? 'online' : 'offline'}`} />
              <span className="nickname">{participant.nickname}</span>
              {participant.isMuted && <span className="muted-badge">채팅 금지</span>}
            </div>
            {participant.nickname !== "관리자" && (
              <div className="participant-controls">
                <button
                  className={`mute-button ${participant.isMuted ? 'unmute' : 'mute'}`}
                  onClick={() => handleToggleMute(participant.id, participant.isMuted)}
                >
                  {participant.isMuted ? '채팅 허용' : '채팅 금지'}
                </button>
                <button
                  className="ban-button"
                  onClick={() => handleBanUser(participant.id)}
                >
                  강퇴
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default ParticipantManager; 