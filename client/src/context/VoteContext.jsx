import React, { createContext, useState } from "react";

export const VoteContext = createContext();

export function VoteProvider({ children }) {
  const [voteData, setVoteData] = useState(null);
  const [results, setResults] = useState({});
  const [hasVoted, setHasVoted] = useState(false);
  const [roomId, setRoomId] = useState(null);  // ✅ roomId 상태 추가

  return (
    <VoteContext.Provider
      value={{ voteData, setVoteData, results, setResults, hasVoted, setHasVoted, roomId, setRoomId }}
    >
      {children}
    </VoteContext.Provider>
  );
}
