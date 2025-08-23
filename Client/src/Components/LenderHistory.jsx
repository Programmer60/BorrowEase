import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { MessageCircle, Search } from "lucide-react";
import Navbar from "./Navbar";
import { loadChatUnreadCounts } from "../api/chatApi";
import { useSocket } from "../contexts/SocketContext";
import { useTheme } from "../contexts/ThemeContext";
import API from "../api/api";

export default function LenderHistory() {
    const { isDark } = useTheme();
    const [loans, setLoans] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [pagination, setPagination] = useState(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [searchTerm, setSearchTerm] = useState("");
    const [debouncedQ, setDebouncedQ] = useState("");
    const navigate = useNavigate();
    const { chatUnreadCounts, updateChatUnreadCounts } = useSocket();

    // Debounce search input to reduce API calls
    useEffect(() => {
        const id = setTimeout(() => setDebouncedQ(searchTerm.trim()), 300);
        return () => clearTimeout(id);
    }, [searchTerm]);

    // Reset to first page whenever debounced search changes
    useEffect(() => {
        setCurrentPage(1);
    }, [debouncedQ]);

    useEffect(() => {
        const loadFundedLoans = async () => {
            try {
                setLoading(true);
                // Send search term to backend so results span all pages
                const params = new URLSearchParams({ page: String(currentPage), limit: String(20) });
                if (debouncedQ) params.set('q', debouncedQ);
                const response = await API.get(`/loans/funded?${params.toString()}`).then(r => r.data);
                
                // Handle both old format (array) and new format (object with loans and pagination)
                const fundedLoans = response.loans || response;
                const paginationData = response.pagination || null;
                
                setLoans(fundedLoans);
                setPagination(paginationData);
                
                // Load chat unread counts for funded loans (optimized bulk call)
                if (fundedLoans.length > 0) {
                    const unreadCounts = await loadChatUnreadCounts(fundedLoans);
                    updateChatUnreadCounts(unreadCounts, true); // Mark as initial load
                }
            } catch (error) {
                setError(error.message);
            } finally {
                setLoading(false);
            }
        };
        loadFundedLoans();
    }, [currentPage, debouncedQ]);

    const totalFunded = loans.reduce((sum, loan) => sum + loan.amount, 0);
    const repaidLoans = loans.filter(loan => loan.repaid).length;
    const pendingLoans = loans.filter(loan => !loan.repaid).length;

        // Client-side search over current page results
        const normalized = (val) => (val || "").toString().toLowerCase();
        const q = normalized(debouncedQ);
            // We already query the backend with q; keep local filter as a secondary guard
            const filteredLoans = q
                    ? loans.filter(loan =>
                            normalized(loan.purpose).includes(q) ||
                            normalized(loan.name).includes(q) ||
                            normalized(loan.collegeEmail).includes(q)
                        )
                    : loans;

    return (
        <>
            <Navbar />
            <div className={`min-h-screen ${
              isDark ? 'bg-gray-900' : 'bg-gray-50'
            }`}>
                {/* Header Section */}
                <div className={`shadow-sm border-b ${
                  isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
                }`}>
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <h1 className={`text-3xl font-bold ${
                                  isDark ? 'text-gray-100' : 'text-gray-900'
                                }`}>Lending History</h1>
                                <p className={`mt-2 ${
                                  isDark ? 'text-gray-300' : 'text-gray-600'
                                }`}>Track your funded loans and their repayment status</p>
                            </div>
                            <div className="hidden md:flex items-center space-x-4">
                                <div className="text-center">
                                    <div className="text-2xl font-bold text-blue-600">{loans.length}</div>
                                    <div className={`text-sm ${
                                      isDark ? 'text-gray-400' : 'text-gray-500'
                                    }`}>Total Loans</div>
                                </div>
                                <div className="text-center">
                                    <div className="text-2xl font-bold text-green-600">₹{totalFunded.toLocaleString()}</div>
                                    <div className={`text-sm ${
                                      isDark ? 'text-gray-400' : 'text-gray-500'
                                    }`}>Total Funded</div>
                                </div>
                                {/* Search box */}
                                <div className="relative">
                                    <Search className={`w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 ${
                                      isDark ? 'text-gray-500' : 'text-gray-400'
                                    }`} />
                                    <input
                                        type="text"
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        placeholder="Search by borrower, email, purpose"
                                        className={`pl-9 pr-3 py-2 w-72 rounded-lg border focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm ${
                                          isDark 
                                            ? 'bg-gray-700 border-gray-600 text-gray-100 placeholder-gray-400' 
                                            : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                                        }`}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Stats Cards */}
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                        <div className={`rounded-lg shadow-sm p-6 border ${
                          isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
                        }`}>
                            <div className="flex items-center">
                                <div className={`p-3 rounded-full ${
                                  isDark ? 'bg-blue-900' : 'bg-blue-100'
                                }`}>
                                    <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                                    </svg>
                                </div>
                                <div className="ml-4">
                                    <p className={`text-sm font-medium ${
                                      isDark ? 'text-gray-400' : 'text-gray-500'
                                    }`}>Total Funded</p>
                                    <p className={`text-2xl font-bold ${
                                      isDark ? 'text-gray-100' : 'text-gray-900'
                                    }`}>₹{totalFunded.toLocaleString()}</p>
                                </div>
                            </div>
                        </div>

                        <div className={`rounded-lg shadow-sm p-6 border ${
                          isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
                        }`}>
                            <div className="flex items-center">
                                <div className={`p-3 rounded-full ${
                                  isDark ? 'bg-green-900' : 'bg-green-100'
                                }`}>
                                    <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                </div>
                                <div className="ml-4">
                                    <p className={`text-sm font-medium ${
                                      isDark ? 'text-gray-400' : 'text-gray-500'
                                    }`}>Repaid Loans</p>
                                    <p className={`text-2xl font-bold ${
                                      isDark ? 'text-gray-100' : 'text-gray-900'
                                    }`}>{repaidLoans}</p>
                                </div>
                            </div>
                        </div>

                        <div className={`rounded-lg shadow-sm p-6 border ${
                          isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
                        }`}>
                            <div className="flex items-center">
                                <div className={`p-3 rounded-full ${
                                  isDark ? 'bg-yellow-900' : 'bg-yellow-100'
                                }`}>
                                    <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                </div>
                                <div className="ml-4">
                                    <p className={`text-sm font-medium ${
                                      isDark ? 'text-gray-400' : 'text-gray-500'
                                    }`}>Pending Repayment</p>
                                    <p className={`text-2xl font-bold ${
                                      isDark ? 'text-gray-100' : 'text-gray-900'
                                    }`}>{pendingLoans}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Loans List */}
                    <div className={`rounded-lg shadow-sm border ${
                      isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
                    }`}>
                        <div className={`px-6 py-4 border-b ${
                          isDark ? 'border-gray-700' : 'border-gray-200'
                        }`}>
                            <h2 className={`text-xl font-semibold ${
                              isDark ? 'text-gray-100' : 'text-gray-900'
                            }`}>Your Funded Loans</h2>
                        </div>

                        {loading ? (
                            <div className="flex justify-center items-center py-12">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                                <span className={`ml-2 ${
                                  isDark ? 'text-gray-300' : 'text-gray-600'
                                }`}>Loading your loans...</span>
                            </div>
                        ) : error ? (
                            <div className="text-center py-12">
                                <div className={`mb-2 ${
                                  isDark ? 'text-red-400' : 'text-red-600'
                                }`}>
                                    <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                </div>
                                <p className={isDark ? 'text-gray-300' : 'text-gray-600'}>Error loading loans: {error}</p>
                            </div>
                        ) : loans.length === 0 ? (
                            <div className="text-center py-12">
                                <div className={`mb-4 ${
                                  isDark ? 'text-gray-500' : 'text-gray-400'
                                }`}>
                                    <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                    </svg>
                                </div>
                                <h3 className={`text-lg font-medium mb-2 ${
                                  isDark ? 'text-gray-200' : 'text-gray-900'
                                }`}>No loans funded yet</h3>
                                <p className={isDark ? 'text-gray-400' : 'text-gray-500'}>Start funding loans to see them here</p>
                            </div>
                        ) : filteredLoans.length === 0 ? (
                            <div className="text-center py-12">
                                <div className={`mb-4 ${
                                  isDark ? 'text-gray-500' : 'text-gray-400'
                                }`}>
                                    <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                    </svg>
                                </div>
                                <h3 className={`text-lg font-medium mb-2 ${
                                  isDark ? 'text-gray-200' : 'text-gray-900'
                                }`}>No matching loans</h3>
                                <p className={isDark ? 'text-gray-400' : 'text-gray-500'}>Try a different name, email, or purpose</p>
                            </div>
                        ) : (
                            <div className={`divide-y ${
                              isDark ? 'divide-gray-700' : 'divide-gray-200'
                            }`}>
                                {filteredLoans.map((loan) => (
                                    <div key={loan._id} className={`p-6 transition-colors ${
                                      isDark ? 'hover:bg-gray-700' : 'hover:bg-gray-50'
                                    }`}>
                                        <div className="flex items-center justify-between">
                                            <div className="flex-1">
                                                <div className="flex items-center space-x-3">
                                                    <div className="flex-shrink-0">
                                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                                                          isDark ? 'bg-blue-900' : 'bg-blue-100'
                                                        }`}>
                                                            <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                                            </svg>
                                                        </div>
                                                    </div>
                                                    <div className="min-w-0 flex-1">
                                                        <div className="flex items-center space-x-2">
                                                            <h3 className={`text-lg font-medium truncate ${
                                                              isDark ? 'text-gray-200' : 'text-gray-900'
                                                            }`}>{loan.purpose}</h3>
                                                            <span className="text-xl font-bold text-blue-600">₹{loan.amount.toLocaleString()}</span>
                                                        </div>
                                                        <div className={`mt-1 flex items-center space-x-4 text-sm ${
                                                          isDark ? 'text-gray-400' : 'text-gray-500'
                                                        }`}>
                                                            <span className="flex items-center">
                                                                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                                                </svg>
                                                                {loan.name}
                                                            </span>
                                                            <span className="flex items-center">
                                                                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                                                </svg>
                                                                {loan.collegeEmail}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex-shrink-0 ml-4 flex items-center space-x-2">
                                                <button
                                                    onClick={() => navigate(`/chat/${loan._id}`)}
                                                    className={`relative inline-flex items-center px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                                                      isDark 
                                                        ? 'bg-blue-900 text-blue-200 hover:bg-blue-800' 
                                                        : 'bg-blue-100 text-blue-800 hover:bg-blue-200'
                                                    }`}
                                                >
                                                    <MessageCircle className="w-4 h-4 mr-1" />
                                                    Chat
                                                    {chatUnreadCounts[loan._id] > 0 && (
                                                        <span className="absolute -top-1 -right-1 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white bg-red-500 rounded-full">
                                                            {chatUnreadCounts[loan._id] > 99 ? '99+' : chatUnreadCounts[loan._id]}
                                                        </span>
                                                    )}
                                                </button>
                                                {loan.repaid ? (
                                                    <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                                                      isDark 
                                                        ? 'bg-green-900 text-green-200' 
                                                        : 'bg-green-100 text-green-800'
                                                    }`}>
                                                        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                        </svg>
                                                        Repaid
                                                    </div>
                                                ) : (
                                                    <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                                                      isDark 
                                                        ? 'bg-yellow-900 text-yellow-200' 
                                                        : 'bg-yellow-100 text-yellow-800'
                                                    }`}>
                                                        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                        </svg>
                                                        Pending
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                        
                        {/* Pagination Controls */}
                        {pagination && pagination.totalPages > 1 && (
                            <div className="mt-8 flex justify-center items-center space-x-4">
                                <button
                                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                                    disabled={!pagination.hasPrev}
                                    className={`px-4 py-2 rounded-lg ${
                                        pagination.hasPrev
                                            ? 'bg-blue-600 text-white hover:bg-blue-700'
                                            : isDark 
                                                ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                                                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                    }`}
                                >
                                    Previous
                                </button>
                                
                                <span className={isDark ? 'text-gray-300' : 'text-gray-600'}>
                                    Page {pagination.currentPage} of {pagination.totalPages}
                                </span>
                                
                                <button
                                    onClick={() => setCurrentPage(prev => Math.min(pagination.totalPages, prev + 1))}
                                    disabled={!pagination.hasNext}
                                    className={`px-4 py-2 rounded-lg ${
                                        pagination.hasNext
                                            ? 'bg-blue-600 text-white hover:bg-blue-700'
                                            : isDark 
                                                ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                                                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                    }`}
                                >
                                    Next
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
}