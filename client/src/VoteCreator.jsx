import React, { useState } from 'react';
import { socket } from './socket';

function VoteCreator({ onClose }) {
  const [title, setTitle] = useState('');
  const [options, setOptions] = useState(['', '']);

  const handleAddOption = () => {
    if (options.length < 6) {
      setOptions([...options, '']);
    }
  };

  const handleRemoveOption = (index) => {
    if (options.length > 2) {
      setOptions(options.filter((_, i) => i !== index));
    }
  };

  const handleOptionChange = (index, value) => {
    const newOptions = [...options];
    newOptions[index] = value;
    setOptions(newOptions);
  };

  const handleSubmit = () => {
    if (!title.trim() || options.some(opt => !opt.trim())) {
      alert('제목과 모든 옵션을 입력해주세요.');
      return;
    }

    const validOptions = options.filter(opt => opt.trim());
    if (validOptions.length < 2) {
      alert('최소 2개의 옵션이 필요합니다.');
      return;
    }

    const newVote = {
      title: title.trim(),
      options: validOptions,
      results: validOptions.map(() => 0),
      voters: [],
      isActive: true,
      createdAt: new Date().toISOString()
    };

    console.log('Creating new vote:', newVote);
    socket.emit('create_vote', newVote);

    if (onClose) onClose();
  };

  return (
    <div style={{ padding: '20px' }}>
      <h3 style={{ marginBottom: '16px' }}>새 투표 만들기</h3>
      
      <div style={{ marginBottom: '20px' }}>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="투표 제목"
          style={{
            width: '100%',
            padding: '8px 12px',
            borderRadius: '6px',
            border: '1px solid #e1e1e1',
            marginBottom: '16px'
          }}
        />

        <div style={{ marginBottom: '16px' }}>
          {options.map((option, index) => (
            <div key={index} style={{ 
              display: 'flex', 
              gap: '8px',
              marginBottom: '8px'
            }}>
              <input
                type="text"
                value={option}
                onChange={(e) => handleOptionChange(index, e.target.value)}
                placeholder={`선택지 ${index + 1}`}
                style={{
                  flex: 1,
                  padding: '8px 12px',
                  borderRadius: '6px',
                  border: '1px solid #e1e1e1'
                }}
              />
              {options.length > 2 && (
                <button
                  onClick={() => handleRemoveOption(index)}
                  style={{
                    padding: '8px',
                    backgroundColor: '#dc3545',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer'
                  }}
                >
                  ✕
                </button>
              )}
            </div>
          ))}
        </div>

        {options.length < 6 && (
          <button
            onClick={handleAddOption}
            style={{
              padding: '8px 16px',
              backgroundColor: '#6c757d',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              marginBottom: '16px'
            }}
          >
            + 선택지 추가
          </button>
        )}
      </div>

      <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
        <button
          onClick={onClose}
          style={{
            padding: '8px 16px',
            backgroundColor: '#6c757d',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer'
          }}
        >
          취소
        </button>
        <button
          onClick={handleSubmit}
          style={{
            padding: '8px 16px',
            backgroundColor: '#4a90e2',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer'
          }}
        >
          투표 생성
        </button>
      </div>
    </div>
  );
}

export default VoteCreator; 