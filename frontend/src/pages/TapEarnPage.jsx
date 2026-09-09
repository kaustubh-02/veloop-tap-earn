import React, { useCallback, useState } from 'react';
import { useTapEarn } from '../hooks/useTapEarn';
import { useAuth } from '../context/AuthContext';
import { tapApi } from '../api/endpoints';

import BalanceCard from '../components/BalanceCard';
import EnergyBar from '../components/EnergyBar';
import TapMultiplierCard from '../components/TapMultiplierCard';
import BoostCard from '../components/BoostCard';
import TapCircle from '../components/TapCircle';
import BigCoinCounter from '../components/BigCoinCounter';
import AmbientScene from '../components/AmbientScene';
import StreakIndicator from '../components/StreakIndicator';
import TapShortcuts from '../components/TapShortcuts';
import BottomNav from '../components/BottomNav';
import Drawer from '../components/Drawer';
import SkeletonBlock from '../components/SkeletonBlock';

import UpgradeDrawer from '../components/UpgradeDrawer';
import EnergyBankModal from '../components/EnergyBankModal';
import EnergyShieldModal from '../components/EnergyShieldModal';
import MissionPanel from '../components/MissionPanel';
import DailyChallengeCard from '../components/DailyChallengeCard';
import LuckyTapModal from '../components/LuckyTapModal';
import RewardHistoryDrawer from '../components/RewardHistoryDrawer';
import TapLeaguePage from './TapLeaguePage';

import './TapEarnPage.css';

const DRAWER_TITLES = {
  upgrades: 'Upgrades',
  energyBank: 'Energy Bank',
  shield: 'Energy Shield',
  missions: 'Missions',
  daily: 'Daily Challenge',
  lucky: 'Lucky Spin',
  history: 'Reward History',
};

export default function TapEarnPage() {
  const { user } = useAuth();
  const { state, balances, loading, error, lastReward, rejection, luckyReady, setLuckyReady, refresh, sendTap } =
    useTapEarn();
  const [activeDrawer, setActiveDrawer] = useState(null);
  const [boosting, setBoosting] = useState(false);
  const [showLeague, setShowLeague] = useState(false);

  const openDrawer = useCallback((key) => {
    if (key === 'league') {
      setShowLeague(true);
      return;
    }
    setActiveDrawer(key);
    if (key === 'lucky') setLuckyReady(false);
  }, [setLuckyReady]);

  const closeDrawer = useCallback(() => setActiveDrawer(null), []);

  const handleTap = useCallback(
    async (opts) => {
      await sendTap(opts);
    },
    [sendTap]
  );

  const handleActivateBoost = useCallback(async () => {
    setBoosting(true);
    try {
      await tapApi.activateBoost();
      await refresh();
    } catch {
      // Rejection surfaced via a subtle inline state would go here; kept
      // minimal since Boost failures are non-critical to the tap loop.
    } finally {
      setBoosting(false);
    }
  }, [refresh]);

  if (showLeague) {
    return <TapLeaguePageWithBack onBack={() => setShowLeague(false)} />;
  }

  if (loading) {
    return (
      <div className="tap-earn-page">
        <SkeletonBlock height={64} />
        <SkeletonBlock height={80} />
        <SkeletonBlock height={64} />
        <SkeletonBlock height={280} radius={140} style={{ margin: '20px auto', width: 220 }} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="tap-earn-page tap-earn-page--error">
        <p>{error}</p>
        <button type="button" onClick={refresh} className="tap-earn-page__retry">
          Retry
        </button>
      </div>
    );
  }

  const energyEmpty = state?.energy && state.energy.current < 1;

  return (
    <div className="tap-earn-page stagger-in">
      <BalanceCard balances={balances} level={user?.level} displayName={user?.displayName} onOpenWallet={() => {}} />

      <EnergyBar energy={state?.energy} onEmpty={refresh} />

      <TapMultiplierCard multitap={state?.multitap} efficiency={state?.efficiency} onOpenUpgrades={() => openDrawer('upgrades')} />

      <BoostCard boost={state?.boost} onActivate={handleActivateBoost} activating={boosting} />

      <div className="tap-earn-page__stage">
        <AmbientScene />
        <div className="tap-earn-page__sign">⚡ TAP TO EARN ⚡</div>
        <BigCoinCounter value={balances?.ve} />
        <div className="tap-earn-page__indicators">
          <StreakIndicator count={state?.streak?.count} />
        </div>
        <TapCircle
          onTap={handleTap}
          disabled={energyEmpty}
          lastReward={lastReward}
          rejection={rejection}
          comboCount={state?.combo?.count}
        />
        {energyEmpty && <p className="tap-earn-page__empty-hint">Energy empty — wait for recharge or open Energy Bank</p>}
      </div>

      <TapShortcuts onOpen={openDrawer} luckyReady={luckyReady} />

      <button type="button" className="tap-earn-page__history-link" onClick={() => openDrawer('history')}>
        View recent reward history →
      </button>

      <BottomNav />

      <Drawer open={activeDrawer === 'upgrades'} onClose={closeDrawer} title={DRAWER_TITLES.upgrades}>
        <UpgradeDrawer state={state} onPurchased={refresh} />
      </Drawer>
      <Drawer open={activeDrawer === 'energyBank'} onClose={closeDrawer} title={DRAWER_TITLES.energyBank}>
        <EnergyBankModal state={state} onPurchased={refresh} />
      </Drawer>
      <Drawer open={activeDrawer === 'shield'} onClose={closeDrawer} title={DRAWER_TITLES.shield}>
        <EnergyShieldModal state={state} onPurchased={refresh} />
      </Drawer>
      <Drawer open={activeDrawer === 'missions'} onClose={closeDrawer} title={DRAWER_TITLES.missions}>
        <MissionPanel onClaimed={refresh} />
      </Drawer>
      <Drawer open={activeDrawer === 'daily'} onClose={closeDrawer} title={DRAWER_TITLES.daily}>
        <DailyChallengeCard onClaimed={refresh} />
      </Drawer>
      <Drawer open={activeDrawer === 'lucky'} onClose={closeDrawer} title={DRAWER_TITLES.lucky}>
        <LuckyTapModal onSpun={refresh} />
      </Drawer>
      <Drawer open={activeDrawer === 'history'} onClose={closeDrawer} title={DRAWER_TITLES.history}>
        <RewardHistoryDrawer />
      </Drawer>
    </div>
  );
}

function TapLeaguePageWithBack({ onBack }) {
  return (
    <div>
      <button type="button" className="tap-earn-page__back" onClick={onBack}>
        ← Back to Tap & Earn
      </button>
      <TapLeaguePage />
    </div>
  );
}
