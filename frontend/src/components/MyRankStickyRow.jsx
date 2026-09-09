import React from 'react';
import VeloopAvatar from './VeloopAvatar';
import './MyRankStickyRow.css';

export default function MyRankStickyRow({ myRank }) {
  if (!myRank) return null;

  return (
    <div className="my-rank-sticky">
      <div className="my-rank-sticky__rank">{myRank.rank ? `#${myRank.rank}` : 'Unranked'}</div>
      <div className="my-rank-sticky__avatar">
        <VeloopAvatar size={34} initial={(myRank.displayName || '?')[0]} glow={false} />
      </div>
      <div className="my-rank-sticky__info">
        <div className="my-rank-sticky__name">{myRank.displayName} (You)</div>
        <div className="my-rank-sticky__level">Lvl {myRank.level}</div>
      </div>
      <div className="my-rank-sticky__score">{myRank.score}</div>
    </div>
  );
}
