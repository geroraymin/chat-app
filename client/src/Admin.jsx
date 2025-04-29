import React, { useState } from "react";
import io from "socket.io-client";
const socket = io("https://chat-app-n2l1.onrender.com");

function Admin() {
  const [title, setTitle] = useState("");
  const [options, setOptions] = useState(["", ""]);
  const [isAnonymous, setIsAnonymous] = useState(true);
  const [voteList, setVoteList] = useState([]);

  const handleOptionChange = (index, value) => {
    const newOptions = [...options];
    newOptions[index] = value;
    setOptions(newOptions);
  };

  const addOption = () => {
    setOptions([...options, ""]);
  };

  const createVote = () => {
    const filteredOptions = options.filter((opt) => opt.trim() !== "");
    if (!title || filteredOptions.length < 2) {
      alert("제목과 최소 2개의 선택지를 입력하세요.");
      return;
    }

    const vote = {
      id: Date.now().toString(),
      title,
      options: filteredOptions,
      isAnonymous,
      results: {},
    };

    socket.emit("create_vote", vote);
    setVoteList((prev) => [...prev, vote]);
    setTitle("");
    setOptions(["", ""]);
  };

  const endVote = (voteId) => {
    socket.emit("end_vote", { voteId });
    alert("투표를 종료했습니다.");
  };

  return (
    <div style={{ padding: "30px", maxWidth: "600px", margin: "0 auto" }}>
      <h2>🛠 관리자 - 투표 생성</h2>
      <input
        placeholder="투표 제목"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        style={{ width: "100%", padding: "10px", marginBottom: "10px" }}
      />
      {options.map((opt, idx) => (
        <input
          key={idx}
          placeholder={`선택지 ${idx + 1}`}
          value={opt}
          onChange={(e) => handleOptionChange(idx, e.target.value)}
          style={{ width: "100%", padding: "8px", marginBottom: "6px" }}
        />
      ))}
      <button onClick={addOption} style={{ marginBottom: "12px" }}>
        + 선택지 추가
      </button>
      <div style={{ marginBottom: "10px" }}>
        <label>
          <input
            type="checkbox"
            checked={isAnonymous}
            onChange={() => setIsAnonymous(!isAnonymous)}
          />
          익명 투표로 설정
        </label>
      </div>
      <button onClick={createVote} style={{ backgroundColor: "#4a90e2", color: "#fff", padding: "10px 20px", border: "none", borderRadius: "6px" }}>
        투표 생성하기
      </button>

      <hr style={{ margin: "30px 0" }} />

      <h3>🗳 생성된 투표</h3>
      {voteList.length === 0 && <p>아직 생성된 투표가 없습니다.</p>}
      {voteList.map((vote) => (
        <div key={vote.id} style={{ marginBottom: "12px" }}>
          <strong>{vote.title}</strong>
          <button
            onClick={() => endVote(vote.id)}
            style={{ marginLeft: "10px", backgroundColor: "#e74c3c", color: "white", border: "none", padding: "4px 8px", borderRadius: "4px" }}
          >
            투표 종료
          </button>
        </div>
      ))}
    </div>
  );
}

export default Admin;
