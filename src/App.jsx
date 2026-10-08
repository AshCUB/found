import { useState, useEffect } from 'react';
import Intro from './components/Intro';
import Subscribe from './components/Subscribe';
import Home from './components/Home';
import DailyFind from './components/DailyFind';
import Capture from './components/Capture';
import ListPage from './components/ListPage';
import Collection from './components/Collection';
import Streak from './components/Streak';
import { useSubscribedLists, useCaptures, useStreakData, useSettings, useEventLogs } from './hooks/useAppData';
import { getAllDailyFinds, storeDailyFinds, loadDailyFinds, shouldRefreshDailyFind, getAlternativeItem } from './utils/dailyFind';

export default function App() {
  // Screen state
  const [currentScreen, setCurrentScreen] = useState('intro');
  const [dailyFindIndex, setDailyFindIndex] = useState(0);

  // Data hooks
  const [subscribedLists, setSubscribedLists] = useSubscribedLists();
  const { captures, addCapture, getCapturedItemIds, isItemCaptured } = useCaptures();
  const { streakData, markDayComplete, checkAndResetStreak, isWeeklySaverAvailable, getWeekData } = useStreakData();
  const [settings, setSettings] = useSettings();
  const { logAppOpen, logDailyFindCompleted } = useEventLogs();

  // Daily finds state
  const [dailyFinds, setDailyFinds] = useState([]);

  // Current capture state
  const [currentCaptureFind, setCurrentCaptureFind] = useState(null);

  // Initialize app
  useEffect(() => {
    logAppOpen();
    checkAndResetStreak();

    // Check if user has already gone through intro
    const hasOnboarded = localStorage.getItem('found_onboarded');
    if (hasOnboarded && subscribedLists.length > 0) {
      setCurrentScreen('home');
    } else if (hasOnboarded) {
      setCurrentScreen('subscribe');
    }

    // Load or generate daily finds
    const storedDailyFinds = loadDailyFinds();
    if (storedDailyFinds && !shouldRefreshDailyFind(storedDailyFinds.date)) {
      setDailyFinds(storedDailyFinds.finds);
    } else {
      refreshDailyFinds();
    }
  }, []);

  // Refresh daily finds when subscribed lists change
  useEffect(() => {
    if (subscribedLists.length > 0) {
      refreshDailyFinds();
    }
  }, [subscribedLists, captures]);

  const refreshDailyFinds = () => {
    const capturedItemIdsByList = {};
    subscribedLists.forEach((listId) => {
      capturedItemIdsByList[listId] = getCapturedItemIds(listId);
    });

    const newDailyFinds = getAllDailyFinds(subscribedLists, capturedItemIdsByList);
    setDailyFinds(newDailyFinds);
    storeDailyFinds(newDailyFinds);
  };

  // Screen handlers
  const handleGetStarted = () => {
    localStorage.setItem('found_onboarded', 'true');
    setCurrentScreen('subscribe');
  };

  const handleSubscribe = (listIds) => {
    setSubscribedLists(listIds);
    setCurrentScreen('home');
  };

  const handleViewDailyFind = (dailyFind) => {
    const index = dailyFinds.findIndex(df => df.listId === dailyFind.listId);
    setDailyFindIndex(index);
    setCurrentScreen('dailyFind');
  };

  const handleCapture = (dailyFind) => {
    setCurrentCaptureFind(dailyFind);
    setCurrentScreen('capture');
  };

  const handleSaveCapture = async (dailyFind, photo, note, foundWithoutPhoto) => {
    try {
      await addCapture(dailyFind.listId, dailyFind.item.id, photo, note, foundWithoutPhoto);
      markDayComplete();
      logDailyFindCompleted(dailyFind.listId, dailyFind.item.id);
      refreshDailyFinds();
    } catch (error) {
      console.error('Error saving capture:', error);
      alert('Storage is full. Please remove some captures to add more.');
    }
  };

  const handleTryAnother = (dailyFind) => {
    const capturedItemIds = getCapturedItemIds(dailyFind.listId);
    const alternativeItem = getAlternativeItem(dailyFind.listId, capturedItemIds, dailyFind.item.id);
    
    if (alternativeItem) {
      const newDailyFinds = dailyFinds.map(df => {
        if (df.listId === dailyFind.listId) {
          return { ...df, item: alternativeItem, captured: false };
        }
        return df;
      });
      setDailyFinds(newDailyFinds);
      storeDailyFinds(newDailyFinds);
    }
  };

  const handleCaptureItem = (listId, item) => {
    setCurrentCaptureFind({ listId, item });
    setCurrentScreen('capture');
  };

  const handleToggleStreak = (show) => {
    setSettings({ ...settings, showStreak: show });
  };

  // Render current screen
  const renderScreen = () => {
    switch (currentScreen) {
      case 'intro':
        return <Intro onGetStarted={handleGetStarted} />;
      
      case 'subscribe':
        return (
          <Subscribe
            onSubscribe={handleSubscribe}
            subscribedLists={subscribedLists}
          />
        );
      
      case 'home':
        return (
          <Home
            streakData={{
              ...streakData,
              isWeeklySaverAvailable: isWeeklySaverAvailable(),
            }}
            showStreak={settings.showStreak}
            dailyFinds={dailyFinds}
            onViewDailyFind={handleViewDailyFind}
            onAddList={() => setCurrentScreen('subscribe')}
            onViewCollection={() => setCurrentScreen('collection')}
            onViewStreak={() => setCurrentScreen('streak')}
          />
        );
      
      case 'dailyFind':
        return (
          <DailyFind
            dailyFinds={dailyFinds}
            currentIndex={dailyFindIndex}
            onCapture={handleCapture}
            onTryAnother={handleTryAnother}
            onClose={() => setCurrentScreen('home')}
          />
        );
      
      case 'capture':
        return (
          <Capture
            dailyFind={currentCaptureFind}
            onSave={handleSaveCapture}
            onCancel={() => setCurrentScreen('home')}
            onMarkWithoutPhoto={() => {
              handleSaveCapture(currentCaptureFind, null, null, true);
            }}
          />
        );
      
      case 'listPage':
        return (
          <ListPage
            subscribedListIds={subscribedLists}
            capturedItemIdsByList={subscribedLists.reduce((acc, listId) => {
              acc[listId] = getCapturedItemIds(listId);
              return acc;
            }, {})}
            onCaptureItem={handleCaptureItem}
            onClose={() => setCurrentScreen('home')}
          />
        );
      
      case 'collection':
        return (
          <Collection
            captures={captures}
            onClose={() => setCurrentScreen('home')}
          />
        );
      
      case 'streak':
        return (
          <Streak
            streakData={{
              ...streakData,
              isWeeklySaverAvailable: isWeeklySaverAvailable(),
              weekData: getWeekData(),
            }}
            showStreak={settings.showStreak}
            onToggleStreak={handleToggleStreak}
            onClose={() => setCurrentScreen('home')}
          />
        );
      
      default:
        return <Intro onGetStarted={handleGetStarted} />;
    }
  };

  return <div className="min-h-screen">{renderScreen()}</div>;
}
