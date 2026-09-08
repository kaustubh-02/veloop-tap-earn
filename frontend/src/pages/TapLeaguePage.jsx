import React, { useEffect, useState } from 'react';
import Countdown from '../components/Countdown';
import LeaderboardRow from '../components/LeaderboardRow';
import MyRankStickyRow from '../components/MyRankStickyRow';
import SkeletonBlock from '../components/SkeletonBlock';
import BottomNav from '../components/BottomNav';
import { tapApi } from '../api/endpoints';
import { useAuth } from '../context/AuthContext';
import './TapLeaguePage.css';

export default function TapLeaguePage() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    tapApi
      .getLeague()
      .then(setData)
      .catch((err) => setError(err?.response?.data?.message || 'Failed to load Tap League'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="league-page page-enter">
      <header className="league-page__header">
        <h1 className="league-page__title">Tap League</h1>
        {data?.season ? (
          <div className="league-page__season">
            <span>{data.season.name}</span>
            <span className="league-page__countdown">
              Ends in <Countdown expiresAt={data.season.endAt} />
            </span>
          </div>
        ) : (
          !loading && <div className="league-page__season">No active season</div>
        )}
      </header>

      <main className="league-page__body">
        {loading && (
          <>
            <SkeletonBlock height={56} />
            <SkeletonBlock height={56} />
            <SkeletonBlock height={56} />
            <SkeletonBlock height={56} />
          </>
        )}

        {error && <div className="mission-panel__error">{error}</div>}

        {!loading && data && (
          <>
            {data.top.length === 0 ? (
              <div className="mission-panel__empty">No scores yet this season — be the first to tap in!</div>
            ) : (
              data.top.map((row) => (
                <LeaderboardRow
                  key={row.userId}
                  rank={row.rank}
                  displayName={row.displayName}
                  level={row.level}
                  score={row.score}
                  isMe={String(row.userId) === String(user?._id)}
                />
              ))
            )}

            {data.rewardPreview && data.rewardPreview.length > 0 && (
              <div className="league-page__rewards">
                <h3 className="league-page__rewards-title">Season Rewards</h3>
                {data.rewardPreview.map((r, i) => (
                  <div key={i} className="league-page__reward-row">
                    <span>
                      Rank {r.rankFrom}
                      {r.rankTo !== r.rankFrom ? `–${r.rankTo}` : ''}
                    </span>
                    <span className="league-page__reward-value">{formatReward(r.reward)}</span>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </main>

      {!loading && data?.myRank && (
        <div className="league-page__sticky">
          <MyRankStickyRow myRank={data.myRank} />
        </div>
      )}

      <BottomNav />
    </div>
  );
}

function formatReward(reward) {
  const parts = [];
  if (reward.ve) parts.push(`${reward.ve} VE`);
  if (reward.sve) parts.push(`${reward.sve} SVE`);
  if (reward.tokens) parts.push(`${reward.tokens} Tokens`);
  if (reward.gems) parts.push(`${reward.gems} Gems`);
  if (reward.spins) parts.push(`${reward.spins} Spins`);
  return parts.join(' + ');
}
