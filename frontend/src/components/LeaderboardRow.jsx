import React from 'react';
import './LeaderboardRow.css';

const TOP_TREATMENT = {
  1: { badge: '🥇', className: 'leaderboard-row--rank1' },
  2: { badge: '🥈', className: 'leaderboard-row--rank2' },
  3: { badge: '🥉', className: 'leaderboard-row--rank3' },
};

export default function LeaderboardRow({ rank, displayName, level, score, isMe }) {
  const treatment = TOP_TREATMENT[rank];

  return (
    <div className={`leaderboard-row ${treatment ? treatment.className : ''} ${isMe ? 'leaderboard-row--me' : ''}`}>
      <div className="leaderboard-row__rank">{treatment ? treatment.badge : rank}</div>
      <div className="leaderboard-row__avatar">{(displayName || '?')[0].toUpperCase()}</div>
      <div className="leaderboard-row__info">
        <div className="leaderboard-row__name">{displayName}</div>
        <div className="leaderboard-row__level">Lvl {level}</div>
      </div>
      <div className="leaderboard-row__score">{formatScore(score)}</div>
    </div>
  );
}

function formatScore(n) {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return n;
}
