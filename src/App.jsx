import { useState, useEffect, useMemo } from 'react';
import Intro from './components/Intro';
import Subscribe from './components/Subscribe';
import Home from './components/Home';
import DailyFind from './components/DailyFind';
import Capture from './components/Capture';
import ListPage from './components/ListPage';
import Collection from './components/Collection';
import Streak from './components/Streak';
import IntroVideo, { shouldShowIntroVideo } from './components/IntroVideo';
import LoggedOutHome, { replayReveal } from './components/LoggedOutHome';
import SignUp from './components/SignUp';
import SignIn from './components/SignIn';
import { getCachedUserId, onUserIdChange, resolveUserId, signOut } from './auth/session';
import { navigate, useRoute } from './utils/router';
import { useCaptures, useStreakData, useEventLogs } from './hooks/useAppData';
import { useOnboarding } from './hooks/useOnboarding';
import { DEFAULT_STREAK, clearUserCache, useUserData } from './hooks/useUserData';
import { clearSignedUrlCache } from './services/userData';
import { getAllDailyFinds, getAlternativeItem, storeDailyFinds, loadDailyFinds, shouldRefreshDailyFind, clearDailyFinds } from './utils/dailyFind';
import { focusLists, isListVisible } from './data/focusLists';

// Full-page screens open scrolled to the top; dailyFind and capture are overlays on top of home.
const PAGE_SCREENS = ['intro', 'listPage', 'collection', 'streak'];

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
  const [listPageListId, setListPageListId] = useState(null);
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

  // Signed-in screens are kept in browser history (on the same URL), so the phone/browser back button closes them.
  useEffect(() => {
    const sync = () => setCurrentScreen(window.history.state?.screen ?? 'home');
    window.addEventListener('popstate', sync);
    // After a reload the screen's in-memory state is gone, so step back to the entry the screens were opened from.
    const depth = window.history.state?.depth;
    if (depth) window.history.go(-depth);
    return () => window.removeEventListener('popstate', sync);
  }, []);

  const openScreen = (screen) => {
    window.history.pushState({ screen, depth: (window.history.state?.depth ?? 0) + 1 }, '');
    setCurrentScreen(screen);
    if (PAGE_SCREENS.includes(screen)) window.scrollTo(0, 0);
  };

  const closeScreen = () => {
    if (window.history.state?.depth) window.history.back();
    else setCurrentScreen('home');
  };

  const goHome = () => {
    const depth = window.history.state?.depth;
    if (depth) window.history.go(-depth);
    else setCurrentScreen('home');
  };

  // Data hooks. Lists, logs, streak and settings are loaded from (and saved to) the user's Supabase account.
  const userData = useUserData(userId);
  const allSubscribedLists = useMemo(() => userData.data?.lists ?? [], [userData.data?.lists]);
  const subscribedLists = allSubscribedLists.filter(isListVisible);
  const captures = useMemo(() => userData.data?.logs ?? [], [userData.data?.logs]);
  const { getCapturedItemIds, isItemCaptured } = useCaptures(captures);
  const streakData = userData.data?.streak ?? DEFAULT_STREAK;
  const { markDayComplete, checkAndResetStreak, getWeekData } = useStreakData(streakData, userData.setStreak);
  const settings = { showStreak: userData.data?.showStreak ?? true };
  const { logAppOpen, logDailyFindCompleted } = useEventLogs();
  const dataLoaded = !!userData.data;

  // Daily finds state
  const [dailyFinds, setDailyFinds] = useState([]);

  // Current capture state
  const [currentCaptureFind, setCurrentCaptureFind] = useState(null);

  useEffect(() => {
    logAppOpen();
  }, []);

  // Only check the streak against fresh data from Supabase, so a stale cache can't overwrite it.
  useEffect(() => {
    if (userId && userData.synced) checkAndResetStreak();
  }, [userId, userData.synced]);

  // Initialize the signed-in user's daily finds once their data is available
  useEffect(() => {
    if (!userId || !dataLoaded) return;

    // Load or generate daily finds
    const storedDailyFinds = loadDailyFinds(userId);
    if (storedDailyFinds && !shouldRefreshDailyFind(storedDailyFinds.date)) {
      setDailyFinds(storedDailyFinds.finds.filter((find) => isListVisible(find.listId)));
    } else {
      refreshDailyFinds();
    }
  }, [userId, dataLoaded]);

  // Refresh daily finds when subscribed lists change
  useEffect(() => {
    if (subscribedLists.length > 0) {
      refreshDailyFinds();
    }
  }, [allSubscribedLists, captures]);

  // Keeps today's existing finds and only picks new ones for lists that don't have one yet.
  const refreshDailyFinds = () => {
    const stored = userId ? loadDailyFinds(userId) : null;
    const existing = stored && !shouldRefreshDailyFind(stored.date) ? stored.finds : [];
    const missing = subscribedLists.filter((listId) => !existing.some((find) => find.listId === listId));
    const capturedItemIdsByList = {};
    missing.forEach((listId) => {
      capturedItemIdsByList[listId] = getCapturedItemIds(listId);
    });

    const fresh = getAllDailyFinds(missing, capturedItemIdsByList);
    const newDailyFinds = subscribedLists
      .map((listId) => existing.find((find) => find.listId === listId) ?? fresh.find((find) => find.listId === listId))
      .filter(Boolean);
    setDailyFinds(newDailyFinds);
    if (userId) storeDailyFinds(newDailyFinds, userId);
  };

  // A daily find is complete once something from its list has been logged today; show the item that was found.
  const todaysDailyFinds = dailyFinds.map((find) => {
    const list = focusLists.find((l) => l.id === find.listId);
    const log = captures.find((c) => c.listId === find.listId && !shouldRefreshDailyFind(c.date));
    if (!log) {
      const capturedIds = getCapturedItemIds(find.listId);
      const canSwap = !!list?.items.some((i) => i.id !== find.item.id && !capturedIds.includes(i.id));
      return { ...find, captured: false, canSwap };
    }
    const item = list?.items.find((i) => i.id === log.itemId);
    return { ...find, item: item ?? find.item, captured: true, canSwap: false };
  }).sort((a, b) => a.captured - b.captured);

  // How much of each selected list has been found, for the home page and list pages.
  const listProgress = subscribedLists
    .map((listId) => {
      const list = focusLists.find((l) => l.id === listId);
      return list && { listId, found: new Set(getCapturedItemIds(listId)).size, total: list.items.length };
    })
    .filter(Boolean);

  // Screen handlers
  // Opens the list picker outside onboarding; finishing returns to the page it was opened from.
  const openListPicker = () => {
    navigate(CHOOSE_LISTS_ROUTE, { state: { returnTo: route } });
  };

  const closeListPicker = () => {
    if (window.history.state?.returnTo) window.history.back();
    else navigate('/', { replace: true });
  };

  // Throws an Error with a user-facing message, so the picker can show it and let the user retry.
  const handleSubscribe = async (listIds) => {
    if (onboarding.completed) {
      await userData.addLists(listIds);
      closeListPicker();
      return;
    }
    try {
      await userData.replaceLists(listIds);
      await onboarding.complete();
    } catch (error) {
      throw new Error("we couldn't save your progress. check your connection and try again.", { cause: error });
    }
    navigate('/', { replace: true });
  };

  const handleViewDailyFind = (dailyFind) => {
    const index = todaysDailyFinds.findIndex(df => df.listId === dailyFind.listId);
    setDailyFindIndex(index);
    openScreen('dailyFind');
  };

  // Swaps today's find for a different unfound item from the same list, and remembers it for the rest of the day.
  const handleSwapDailyFind = (listId) => {
    const current = dailyFinds.find((find) => find.listId === listId);
    const item = getAlternativeItem(listId, getCapturedItemIds(listId), current?.item.id);
    if (!item) return;
    const next = dailyFinds.map((find) => (find.listId === listId ? { ...find, item } : find));
    setDailyFinds(next);
    if (userId) storeDailyFinds(next, userId);
  };

  const handleCapture = (dailyFind) => {
    setCurrentCaptureFind(dailyFind);
    openScreen('capture');
  };

  const handleViewList = (listId) => {
    setListPageListId(listId);
    openScreen('listPage');
  };

  // Throws if the find couldn't be saved, so the capture screen can show the error and let the user retry.
  const handleSaveCapture = async (dailyFind, photo, note, foundWithoutPhoto) => {
    await userData.addLog({ listId: dailyFind.listId, itemId: dailyFind.item.id, photo, note, foundWithoutPhoto });
    markDayComplete();
    logDailyFindCompleted(dailyFind.listId, dailyFind.item.id);
    refreshDailyFinds();
  };

  const handleCaptureItem = (listId, item) => {
    setCurrentCaptureFind({ listId, item, fromList: true });
    openScreen('capture');
  };

  // Shows the loading screen until the session is cleared, so the logged-out landing page doesn't flash first.
  const handleSignOut = async () => {
    setSigningOut(true);
    // Don't leave this account's cached data on the device after signing out.
    if (userId) {
      clearUserCache(userId);
      clearDailyFinds(userId);
    }
    clearSignedUrlCache();
    await signOut();
    replayReveal();
    setShowIntroVideo(false);
    setIntroLeaving(false);
    setUserId(null);
    navigate('/', { replace: true });
    setSigningOut(false);
  };

  const handleToggleStreak = (show) => {
    userData.setShowStreak(show).catch((error) => {
      console.error('Error saving settings:', error.cause ?? error);
      alert(error.message);
    });
  };

  // Render current screen
  const renderScreen = () => {
    switch (currentScreen) {
      case 'intro':
        return <Intro onGetStarted={openListPicker} />;
      
      case 'home':
        return (
          <Home
            streakData={streakData}
            showStreak={settings.showStreak}
            dailyFinds={todaysDailyFinds}
            listProgress={listProgress}
            onViewDailyFind={handleViewDailyFind}
            onViewList={handleViewList}
            onAddList={openListPicker}
            onViewCollection={() => openScreen('collection')}
            onViewStreak={() => openScreen('streak')}
            onSignOut={handleSignOut}
          />
        );
      
      case 'dailyFind':
        return (
          <DailyFind
            dailyFinds={todaysDailyFinds}
            currentIndex={dailyFindIndex}
            onCapture={handleCapture}
            onSwap={handleSwapDailyFind}
            onClose={closeScreen}
          />
        );
      
      case 'capture':
        return (
          <Capture
            dailyFind={currentCaptureFind}
            onSave={handleSaveCapture}
            onCancel={closeScreen}
            onDone={currentCaptureFind?.fromList ? closeScreen : goHome}
          />
        );
      
      case 'listPage':
        return (
          <ListPage
            subscribedListIds={subscribedLists}
            initialListId={listPageListId}
            listProgress={listProgress}
            capturedItemIdsByList={subscribedLists.reduce((acc, listId) => {
              acc[listId] = getCapturedItemIds(listId);
              return acc;
            }, {})}
            onCaptureItem={handleCaptureItem}
            onAddList={openListPicker}
            onClose={closeScreen}
          />
        );
      
      case 'collection':
        return (
          <Collection
            captures={captures}
            subscribedLists={subscribedLists}
            onUpdateNote={userData.updateLogNote}
            onDelete={userData.deleteLog}
            onClose={closeScreen}
          />
        );
      
      case 'streak':
        return (
          <Streak
            streakData={{
              ...streakData,
              weekData: getWeekData(),
            }}
            totalFinds={captures.length}
            showStreak={settings.showStreak}
            onToggleStreak={handleToggleStreak}
            onClose={closeScreen}
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
    // Signed-in pages that need the user's lists and collection wait for them (instant when cached).
    if (userId && !userData.data && (route === CHOOSE_LISTS_ROUTE || !ONBOARDING_ROUTES.includes(route))) {
      return userData.error ? <LoadErrorScreen onRetry={userData.retry} /> : <LoadingScreen />;
    }
    switch (route) {
      case '/create-account':
        return <SignUp />;
      case '/sign-in':
        return <SignIn />;
      case GET_STARTED_ROUTE:
        return <Intro onGetStarted={() => navigate(CHOOSE_LISTS_ROUTE)} />;
      case CHOOSE_LISTS_ROUTE:
        return (
          <Subscribe
            onSubscribe={handleSubscribe}
            subscribedLists={subscribedLists}
            adding={!!onboarding.completed}
            onCancel={closeListPicker}
          />
        );
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
