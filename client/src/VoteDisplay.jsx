import React from "react";
import { Doughnut } from "react-chartjs-2";
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
} from "chart.js";

ChartJS.register(ArcElement, Tooltip, Legend);

function VoteDisplay({ voteData, socket, nickname, userVotes, setUserVotes }) {
  const handleVote = (voteId, choice, isEnded) => {
    if (userVotes[voteId] || isEnded) return;
    socket.emit("submit_vote", { voteId, option: choice, nickname });
    setUserVotes((prev) => ({ ...prev, [voteId]: choice }));
  };

  return (
    <div className="vote-container">
      {voteData.map((vote) => {
        const hasVoted = !!userVotes[vote.id];
        const results = vote.results || {};
        const totalVotes = Object.values(results).reduce((a, b) => a + b, 0);

        const chartData = {
          labels: vote.options,
          datasets: [
            {
              data: vote.options.map((opt) => results[opt] || 0),
              backgroundColor: [
                "#4a90e2",
                "#50e3c2",
                "#f8e71c",
                "#e94e77",
                "#7ed6df",
                "#f9ca24",
              ],
              borderWidth: 1,
            },
          ],
        };

        return (
          <div className="vote-box" key={vote.id}>
            <h3>
              🗳 {vote.title}
              {vote.ended && <span style={{ color: "red", marginLeft: "10px" }}>투표 종료됨</span>}
            </h3>

            {!hasVoted && (
              <div>
                {vote.options.map((opt, idx) => (
                  <label className="vote-option" key={idx}>
                    <input
                      type="radio"
                      name={`vote-${vote.id}`}
                      onChange={() => handleVote(vote.id, opt, vote.ended)}
                      disabled={vote.ended}
                    />
                    {opt}
                  </label>
                ))}
              </div>
            )}

            {hasVoted && (
              <div className="vote-result">
                <Doughnut data={chartData} />
                <p style={{ marginTop: "10px", textAlign: "center" }}>
                  총 투표 수: {totalVotes}
                </p>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default VoteDisplay;
