import { useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { setTimer } from '../store/interviewSlice';

const Timer = () => {
  const dispatch = useDispatch();
  const timer = useSelector((state) => state.interview.timer);
  const countRef = useRef(timer);

  // Keep ref in sync when timer is reset externally (e.g., next question resets to 0)
  useEffect(() => {
    countRef.current = timer;
  }, [timer]);

  // Create interval only ONCE on mount — avoids re-creating every second
  useEffect(() => {
    const id = setInterval(() => {
      countRef.current += 1;
      dispatch(setTimer(countRef.current));
    }, 1000);
    return () => clearInterval(id);
  }, [dispatch]);

  const formatTime = (totalSeconds) => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    if (hours > 0) {
      return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    }
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  };

  return (
    <div className="flex items-center space-x-2 bg-gray-800 px-4 py-2 rounded-lg">
      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
      <span className="text-lg font-mono font-semibold text-white">
        {formatTime(timer)}
      </span>
    </div>
  );
};

export default Timer;
