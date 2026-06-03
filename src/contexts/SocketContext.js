// src/contexts/SocketContext.js
import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';

const SocketContext = createContext(null);

export const SocketProvider = ({ children }) => {
  const { user } = useAuth();
  const [socket, setSocket] = useState(null);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const socketRef = useRef(null);

  useEffect(() => {
    if (!user) {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
        setSocket(null);
      }
      return;
    }

    const token = localStorage.getItem('accessToken');
    const SOCKET_URL = process.env.REACT_APP_SOCKET_URL || 'http://localhost:5000';

    const s = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 5,
      reconnectionDelay: 2000,
    });

    s.on('connect', () => console.log('🔌 Socket connected'));
    s.on('disconnect', () => console.log('❌ Socket disconnected'));
    s.on('connect_error', (err) => console.error('Socket error:', err.message));

    s.on('user:online', ({ userId, user: onlineUser }) => {
      setOnlineUsers((prev) => {
        const filtered = prev.filter((u) => u.id !== userId);
        return [...filtered, onlineUser];
      });
    });

    s.on('user:offline', ({ userId }) => {
      setOnlineUsers((prev) => prev.filter((u) => u.id !== userId));
    });

    socketRef.current = s;
    setSocket(s);

    return () => { s.disconnect(); socketRef.current = null; };
  }, [user]);

  const joinProject = (projectId) => socket?.emit('join:project', projectId);
  const leaveProject = (projectId) => socket?.emit('leave:project', projectId);
  const joinTask = (taskId) => socket?.emit('join:task', taskId);
  const leaveTask = (taskId) => socket?.emit('leave:task', taskId);

  return (
    <SocketContext.Provider value={{ socket, onlineUsers, joinProject, leaveProject, joinTask, leaveTask }}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => useContext(SocketContext);
