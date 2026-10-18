import { useState, useEffect } from 'react';
import Intro from './components/Intro';
import Subscribe from './components/Subscribe';
import Home from './components/Home';
import DailyFind from './components/DailyFind';
import Capture from './components/Capture';
import ListPage from './components/ListPage';
import Collection from './components/Collection';
import Streak from './components/Streak';
import IntroVideo, { shouldShowIntroVideo, isIntroVideoDevice } from './components/IntroVideo';
import LoggedOutHome, { replayReveal } from './components/LoggedOutHome';
import SignUp from './components/SignUp';
import SignIn from './components/SignIn';
import { getCachedUserId, onUserIdChange, resolveUserId, signOut } from './auth/session';
import { navigate, useRoute } from './utils/router';
import { useSubscribedLists, useCaptures, useStreakData, useSettings, useEventLogs } from './hooks/useAppData';
import { useOnboarding } from './hooks/useOnboarding';
import { getAllDailyFinds, storeDailyFinds, loadDailyFinds, shouldRefreshDailyFind } from './utils/dailyFind';
import { isListVisible } from './data/focusLists';

const SIGNED_OUT_ONLY_ROUTES = ['/sign-in', '/create-account'];
const GET_STARTED_ROUTE = '/get-started';
const CHOOSE_LISTS_ROUTE = '/choose-lists';
const ONBOARDING_ROUTES = [GET_STARTED_ROUTE, CHOOSE_LISTS_ROUTE];

// Where the current route should send the user: a path to redirect to, null to render the route,
// or undefined while the session or onboarding status is still loading.
function getRedirect(route, userId, onboardingCompleted) {
  if (userId === undefined) return undefined;
  if (!userId) {
    if (ONBOARDING_ROUTES.includes(route)) return '/sign-in';
    return route === '/' || SIGNED_OUT_ONLY_ROUTES.includes(route) ? null : '/';
  }
  if (SIGNED_OUT_ONLY_ROUTES.includes(route)) return '/';
  if (onboardingCompleted === undefined) return undefined;
  if (!onboardingCompleted) return ONBOARDING_ROUTES.includes(route) ? null : GET_STARTED_ROUTE;
  // The list picker stays reachable on demand (e.g. "Add a list") after onboarding.
  return route === '/' || route === CHOOSE_LISTS_ROUTE ? null : '/';
}

function LoadingScreen() {
  return (
    <div className="min-h-screen bg-grey" role="status">
      <span className="sr-only">loading…</span>
    </div>
  );
}

function LoadErrorScreen({ onRetry }) {
  return (
    <div className="min-h-screen bg-grey flex flex-col items-center justify-center p-lg">
      <div className="max-w-md w-full text-center" role="alert">
        <p className="font-body text-sm text-dark-grey mb-lg">
          we couldn't load your account. check your connection and try again.
        </p>
        <button
          onClick={onRetry}
          className="font-buttons text-lg bg-green text-white px-xl py-md rounded-full w-full hover:opacity-90 transition-opacity"
        >
          try again
        </button>
      </div>
    </div>
  );
}

export default function App() {
  // Screen state
  const [currentScreen, setCurrentScreen] = useState('home');
  const [dailyFindIndex, setDailyFindIndex] = useState(0);
  const [showIntroVideo, setShowIntroVideo] = useState(shouldShowIntroVideo);
  const [introLeaving, setIntroLeaving] = useState(false);
  const route = useRoute();

  // Auth: undefined while resolving, so no page renders before the answer is known.
  const [userId, setUserId] = useState(getCachedUserId);
  const [signingOut, setSigningOut] = useState(false);
  useEffect(() => {
    let active = true;
    resolveUserId().then((value) => active && setUserId(value));
    const unsubscribe = onUserIdChange(setUserId);
    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  // Onboarding status lives on the user's Supabase profile, so it follows them across sign-outs and devices.
  const onboarding = useOnboarding(userId);
  const redirect = getRedirect(route, userId, onboarding.completed);
  useEffect(() => {
    if (redirect) navigate(redirect, { replace: true });
  }, [redirect]);

  useEffect(() => {
    setCurrentScreen('home');
  }, [userId]);

  // Data hooks
  const [allSubscribedLists, setSubscribedLists] = useSubscribedLists();
  const subscribedLists = allSubscribedLists.filter(isListVisible);
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

    // Load or generate daily finds
    const storedDailyFinds = loadDailyFinds();
    if (storedDailyFinds && !shouldRefreshDailyFind(storedDailyFinds.date)) {
      setDailyFinds(storedDailyFinds.finds.filter((find) => isListVisible(find.listId)));
    } else {
      refreshDailyFinds();
    }
  }, []);

  // Refresh daily finds when subscribed lists change
  useEffect(() => {
    if (subscribedLists.length > 0) {
      refreshDailyFinds();
    }
  }, [allSubscribedLists, captures]);

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
  // Opens the list picker outside onboarding; finishing returns to the page it was opened from.
  const openListPicker = () => {
    setCurrentScreen('home');
    navigate(CHOOSE_LISTS_ROUTE, { state: { returnTo: route } });
  };

  const handleSubscribe = async (listIds) => {
    if (onboarding.completed) {
      setSubscribedLists((prev) => [...new Set([...prev, ...listIds])]);
      if (window.history.state?.returnTo) window.history.back();
      else navigate('/', { replace: true });
      return;
    }
    setSubscribedLists(listIds);
    try {
      await onboarding.complete();
      navigate('/', { replace: true });
    } catch (error) {
      console.error('Error completing onboarding:', error);
      alert("we couldn't save your progress. check your connection and try again.");
    }
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

  const handleCaptureItem = (listId, item) => {
    setCurrentCaptureFind({ listId, item });
    setCurrentScreen('capture');
  };

  // Shows the loading screen until the session is cleared, so the logged-out landing page doesn't flash first.
  const handleSignOut = async () => {
    setSigningOut(true);
    await signOut();
    replayReveal();
    setShowIntroVideo(false);
    setIntroLeaving(false);
    setUserId(null);
    navigate('/', { replace: true });
    setSigningOut(false);
  };

  const handleToggleStreak = (show) => {
    setSettings({ ...settings, showStreak: show });
  };

  // Render current screen
  const renderScreen = () => {
    switch (currentScreen) {
      case 'intro':
        return <Intro onGetStarted={openListPicker} />;
      
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
            onAddList={openListPicker}
            onViewCollection={() => setCurrentScreen('collection')}
            onViewStreak={() => setCurrentScreen('streak')}
            onSignOut={handleSignOut}
            onGoToIntro={() => {
              setCurrentScreen('intro');
              setShowIntroVideo(isIntroVideoDevice());
            }}
          />
        );
      
      case 'dailyFind':
        return (
          <DailyFind
            dailyFinds={dailyFinds}
            currentIndex={dailyFindIndex}
            onCapture={handleCapture}
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
            subscribedLists={subscribedLists}
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
        return <Intro onGetStarted={openListPicker} />;
    }
  };

  const renderRoute = () => {
    if (signingOut) return <LoadingScreen />;
    if (redirect === undefined) {
      return userId && onboarding.error ? <LoadErrorScreen onRetry={onboarding.retry} /> : <LoadingScreen />;
    }
    if (redirect) return <LoadingScreen />;
    switch (route) {
      case '/create-account':
        return <SignUp />;
      case '/sign-in':
        return <SignIn />;
      case GET_STARTED_ROUTE:
        return <Intro onGetStarted={() => navigate(CHOOSE_LISTS_ROUTE)} />;
      case CHOOSE_LISTS_ROUTE:
        return <Subscribe onSubscribe={handleSubscribe} subscribedLists={subscribedLists} />;
      default:
        if (userId) return renderScreen();
        return <LoggedOutHome introPhase={showIntroVideo ? (introLeaving ? 'leaving' : 'playing') : 'done'} />;
    }
  };

  return (
    <div className="min-h-screen">
      {renderRoute()}
      {showIntroVideo && (
        <IntroVideo
          onLeaveStart={() => setIntroLeaving(true)}
          onFinish={() => {
            setShowIntroVideo(false);
            setIntroLeaving(false);
          }}
        />
      )}
      {/* TEMP: dev-only shortcut back to the intro screen. Remove later. */}
      {false && import.meta.env.DEV && currentScreen !== 'intro' && (
        <button
          onClick={() => setCurrentScreen('intro')}
          className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 font-buttons text-xs bg-black text-white px-md py-xs rounded-full opacity-70 hover:opacity-100"
        >
          dev intro
        </button>
      )}
    </div>
  );
}
