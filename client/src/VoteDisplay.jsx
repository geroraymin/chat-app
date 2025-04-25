import React, { useEffect, useState } from 'react';
import { socket } from './socket';
import './VoteDisplay.css';

const VoteDisplay = ({ isAdmin, nickname, voteData, userVotes, onVote, onEndVote }) => {
  const [localVotes, setLocalVotes] = useState(voteData || []);

  useEffect(() => {
    setLocalVotes(voteData);
  }, [voteData]);

  useEffect(() => {
    console.log('VoteDisplay mounted');

    socket.on("vote_updated", (updatedVote) => {
      console.log('Vote updated:', updatedVote);
      setLocalVotes(prev => 
        prev.map(v => v.id === updatedVote.id ? updatedVote : v)
      );
    });

    return () => {
      socket.off("vote_updated");
    };
  }, []);

  const handleVote = (voteId, optionIndex) => {
    if (onVote) {
      onVote(voteId, optionIndex);
    }
  };

  const handleEndVote = (voteId) => {
    if (onEndVote) {
      onEndVote(voteId);
    }
  };

  const calculatePercentage = (count, total) => {
    if (total === 0) return 0;
    return Math.round((count / total) * 100);
  };

  if (!localVotes || localVotes.length === 0) {
    return (
      <div className="vote-display">
        <h2>투표</h2>
        <p>현재 진행 중인 투표가 없습니다.</p>
      </div>
    );
  }

  return (
    <div className="vote-display">
      <h2>투표</h2>
      <div className="votes-list">
        {localVotes.map((vote) => {
          const totalVotes = vote.results.reduce((sum, count) => sum + count, 0);
          const hasVoted = userVotes[vote.id] !== undefined;

          return (
            <div key={vote.id} className={`vote-item ${!vote.isActive ? 'ended' : ''}`}>
              <h3>{vote.title}</h3>
              <div className="vote-options">
                {vote.options.map((option, index) => {
                  const percentage = calculatePercentage(vote.results[index], totalVotes);
                  const isSelected = userVotes[vote.id] === index;

                  return (
                    <div key={index} className="vote-option">
                      {(!hasVoted && vote.isActive) ? (
                        <button
                          className={`vote-button ${isSelected ? 'voted' : ''}`}
                          onClick={() => handleVote(vote.id, index)}
                          disabled={!vote.isActive || hasVoted}
                        >
                          {option}
                        </button>
                      ) : (
                        <div className="vote-result">
                          <div 
                            className="vote-bar" 
                            style={{ width: `${percentage}%` }}
                          />
                          <span>
                            {option} ({vote.results[index]}표, {percentage}%)
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              <div className="vote-info">
                <span>총 {totalVotes}명 참여</span>
                <span className={`vote-status ${!vote.isActive ? 'ended' : ''}`}>
                  {vote.isActive ? '진행중' : '종료됨'}
                </span>
              </div>
              {isAdmin && vote.isActive && (
                <div className="admin-controls">
                  <button 
                    onClick={() => handleEndVote(vote.id)}
                    className="end-vote-button"
                  >
                    투표 종료
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default VoteDisplay;
