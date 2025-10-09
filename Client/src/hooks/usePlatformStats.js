import { useState, useEffect } from 'react';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

/**
 * Custom hook to fetch real platform statistics
 * Falls back to default values if API fails to maintain UX
 */
export const usePlatformStats = () => {
  const [stats, setStats] = useState({
    totalUsers: "10K+",
    studentsHelped: "8K+",
    activeLenders: "2K+",
    loansFunded: "₹50Cr+",
    successRate: "98%",
    avgApprovalTime: "24hrs",
    raw: {
      totalUsers: 10000,
      totalBorrowers: 8000,
      totalLenders: 2000,
      totalLoans: 5000,
      approvedLoans: 4900,
      fundedLoans: 4500,
      repaidLoans: 4000,
      totalAmount: 500000000,
      approvedAmount: 480000000,
      successRate: 98
    },
    isLoading: true,
    isError: false,
    isFallback: true // Flag to indicate if using fallback data
  });

  useEffect(() => {
    const fetchStats = async () => {
      try {
        console.log('📊 Fetching real platform statistics...');
        const response = await axios.get(`${API_URL}/loans/public/stats`);
        
        if (response.data) {
          console.log('✅ Real stats loaded:', response.data);
          setStats({
            ...response.data,
            isLoading: false,
            isError: false,
            isFallback: false // Real data loaded successfully
          });
        }
      } catch (error) {
        console.warn('⚠️ Failed to load real stats, using fallback data:', error.message);
        // Keep fallback data but mark as complete loading
        setStats(prev => ({
          ...prev,
          isLoading: false,
          isError: true,
          isFallback: true
        }));
      }
    };

    fetchStats();
    
    // Refresh stats every 5 minutes to keep data fresh
    const interval = setInterval(fetchStats, 5 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, []);

  return stats;
};

export default usePlatformStats;
