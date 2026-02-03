"use client";

import { useState, useEffect } from 'react';

type Stats = {
  cvsSent: number;
  emailsSent: number;
};

export const useStats = () => {
  const [stats, setStats] = useState<Stats>({ cvsSent: 0, emailsSent: 0 });
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const storedCvs = localStorage.getItem('cvsSent');
    const storedEmails = localStorage.getItem('emailsSent');
    if (storedCvs || storedEmails) {
      setStats({
        cvsSent: storedCvs ? parseInt(storedCvs, 10) : 0,
        emailsSent: storedEmails ? parseInt(storedEmails, 10) : 0,
      });
    }
    setIsLoaded(true);
  }, []);

  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem('cvsSent', stats.cvsSent.toString());
      localStorage.setItem('emailsSent', stats.emailsSent.toString());
    }
  }, [stats, isLoaded]);

  const incrementStats = (emails: number, cvs: number) => {
    setStats((prev) => ({
      cvsSent: prev.cvsSent + cvs,
      emailsSent: prev.emailsSent + emails,
    }));
  };

  const resetStats = (code: string): boolean => {
    if (code === '1941') {
      setStats({ cvsSent: 0, emailsSent: 0 });
      // localStorage update is handled by useEffect
      return true;
    }
    return false;
  };

  return { stats, incrementStats, resetStats };
};
