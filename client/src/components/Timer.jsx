import { useEffect, useMemo, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { setTimer } from '../store/interviewSlice';

const Timer = ({ startedAt, timeLimitMinutes, onExpire }) => {
  const dispatch = useDispatch();
  const timer = useSelector((state) => state.interview.timer);
  const countRef = useRef(timer);
  const [nowMs, setNowMs] = useState(Date.now());

  // Keep ref in sync when timer is reset externally (e.g., next question resets to 0)
  useEffect(() => {
    countRef.current = timer;
  }, [timer]);

  // Create interval only ONCE on mount — avoids re-creating every second
  useEffect(() => {
    const id = setInterval(() => {
      countRef.current += 1;
      dispatch(setTimer(countRef.current));
      setNowMs(Date.now());
    }, 1000);
    return () => clearInterval(id);
  }, [dispatch]);

  const deadlineMs = useMemo(() => {
    if (!startedAt || !timeLimitMinutes) return null;
    const start = new Date(startedAt).getTime();
    if (Number.isNaN(start)) return null;
    return start + (timeLimitMinutes * 60 * 1000);
  }, [startedAt, timeLimitMinutes]);

  const remainingSeconds = useMemo(() => {
    if (!deadlineMs) return null;
    return Math.max(0, Math.floor((deadlineMs - nowMs) / 1000));
  }, [deadlineMs, nowMs]);

  useEffect(() => {
    if (remainingSeconds === 0 && typeof onExpire === 'function') {
      onExpire();
    }
  }, [remainingSeconds, onExpire]);

  const formatTime = (totalSeconds) => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    if (hours > 0) {
      return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    }
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  };

  const warningClass =
    remainingSeconds !== null && remainingSeconds <= 60
      ? 'text-red-300'
      : remainingSeconds !== null && remainingSeconds <= 300
        ? 'text-yellow-300'
        : 'text-white';

  return (
    <div className="flex items-center space-x-2 bg-gray-800 px-4 py-2 rounded-lg">
      <div className={`w-2 h-2 rounded-full animate-pulse ${remainingSeconds !== null && remainingSeconds <= 60 ? 'bg-red-500' : 'bg-green-500'}`} />
      <div className="flex flex-col leading-tight">
        <span className={`text-lg font-mono font-semibold ${warningClass}`}>
          {remainingSeconds !== null ? formatTime(remainingSeconds) : formatTime(timer)}
        </span>
        {remainingSeconds !== null && (
          <span className="text-[10px] text-gray-400">session left</span>
        )}
      </div>
    </div>
  );
};

export default Timer;
