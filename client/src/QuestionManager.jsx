import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { socket } from './socket';
import './QuestionManager.css';

const QuestionManager = ({ nickname, isInstructor }) => {
  const [questions, setQuestions] = useState([]);
  const [newQuestion, setNewQuestion] = useState('');
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    console.log('QuestionManager mounted:', { nickname, isInstructor });
    
    const handleNewQuestion = (question) => {
      console.log('New question received:', question);
      setQuestions(prev => [...prev, question]);
    };

    const handleStatusUpdate = ({ questionId, status }) => {
      console.log('Question status updated:', { questionId, status });
      setQuestions(prev => prev.map(q => 
        q.id === questionId ? { ...q, status } : q
      ));
    };

    const handleQuestionsUpdate = (updatedQuestions) => {
      console.log('Questions updated:', updatedQuestions);
      setQuestions(updatedQuestions);
    };

    // 초기 질문 데이터 요청
    socket.emit('request_questions');

    // 이벤트 리스너 등록
    socket.on('new_question', handleNewQuestion);
    socket.on('question_status_updated', handleStatusUpdate);
    socket.on('questions_update', handleQuestionsUpdate);

    return () => {
      socket.off('new_question', handleNewQuestion);
      socket.off('question_status_updated', handleStatusUpdate);
      socket.off('questions_update', handleQuestionsUpdate);
    };
  }, [nickname, isInstructor]);

  const handleSubmitQuestion = useCallback((e) => {
    e.preventDefault();
    if (!newQuestion.trim()) return;

    const questionData = {
      text: newQuestion.trim(),
      author: nickname,
      status: 'pending',
      timestamp: new Date().toISOString()
    };

    console.log('Submitting question:', questionData);
    socket.emit('submit_question', questionData);
    setNewQuestion('');
  }, [newQuestion, nickname]);

  const handleUpdateStatus = useCallback((questionId, newStatus) => {
    console.log('Updating question status:', { questionId, newStatus });
    socket.emit('update_question_status', { questionId, status: newStatus });
  }, []);

  const filteredQuestions = useMemo(() => {
    return questions.filter(q => {
      if (filter === 'all') return true;
      return q.status === filter;
    });
  }, [questions, filter]);

  const getStatusLabel = useCallback((status) => {
    switch(status) {
      case 'pending': return '대기중';
      case 'inProgress': return '진행중';
      case 'completed': return '완료';
      default: return status;
    }
  }, []);

  const statusCounts = useMemo(() => {
    return questions.reduce((acc, q) => {
      acc[q.status] = (acc[q.status] || 0) + 1;
      return acc;
    }, {});
  }, [questions]);

  return (
    <div className="question-manager">
      {!isInstructor && (
        <form onSubmit={handleSubmitQuestion} className="question-form">
          <textarea
            value={newQuestion}
            onChange={(e) => setNewQuestion(e.target.value)}
            placeholder="질문을 입력하세요..."
            className="question-input"
          />
          <button type="submit" className="submit-button">
            질문하기
          </button>
        </form>
      )}

      <div className="filter-buttons">
        <button 
          className={filter === 'all' ? 'active' : ''} 
          onClick={() => setFilter('all')}
        >
          전체 ({questions.length})
        </button>
        <button 
          className={filter === 'pending' ? 'active' : ''} 
          onClick={() => setFilter('pending')}
        >
          대기중 ({statusCounts.pending || 0})
        </button>
        <button 
          className={filter === 'inProgress' ? 'active' : ''} 
          onClick={() => setFilter('inProgress')}
        >
          진행중 ({statusCounts.inProgress || 0})
        </button>
        <button 
          className={filter === 'completed' ? 'active' : ''} 
          onClick={() => setFilter('completed')}
        >
          완료 ({statusCounts.completed || 0})
        </button>
      </div>

      <div className="questions-list">
        {filteredQuestions.length === 0 ? (
          <p className="no-questions">질문이 없습니다.</p>
        ) : (
          filteredQuestions.map((question) => (
            <div key={question.id} className={`question-item ${question.status}`}>
              <div className="question-content">
                <p className="question-text">{question.text}</p>
                <div className="question-info">
                  <span>작성자: {question.author}</span>
                  <span>상태: {getStatusLabel(question.status)}</span>
                  <span>작성일: {new Date(question.timestamp).toLocaleString()}</span>
                </div>
              </div>
              {isInstructor && (
                <div className="question-actions">
                  <button 
                    onClick={() => handleUpdateStatus(question.id, 'pending')}
                    className={question.status === 'pending' ? 'active' : ''}
                  >
                    대기
                  </button>
                  <button 
                    onClick={() => handleUpdateStatus(question.id, 'inProgress')}
                    className={question.status === 'inProgress' ? 'active' : ''}
                  >
                    진행
                  </button>
                  <button 
                    onClick={() => handleUpdateStatus(question.id, 'completed')}
                    className={question.status === 'completed' ? 'active' : ''}
                  >
                    완료
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default React.memo(QuestionManager); 