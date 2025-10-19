import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { MessageCircle } from "lucide-react";
import Navbar from "./Navbar";
import { getMyLoans } from "../api/loanApi";
import { loadChatUnreadCounts } from "../api/chatApi";
import { useSocket } from "../contexts/SocketContext";
import API from "../api/api";
import { useTheme } from "../contexts/ThemeContext";

export default function BorrowerHistory () {
    const { isDark } = useTheme();
    const [loans, setLoans] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [pagination, setPagination] = useState(null);
    const [currentPage, setCurrentPage] = useState(1);
    const navigate = useNavigate();
    
    // Use centralized socket context for chat notifications
    const { chatUnreadCounts, updateChatUnreadCounts } = useSocket();

    useEffect(() => {
        const loadMyLoans = async () => {
            try {
                setLoading(true);
                const response = await getMyLoans(currentPage, 20);
                
                // Handle both old format (array) and new format (object with loans and pagination)
                const myLoans = response.loans || response;
                const paginationData = response.pagination || null;
                
                setLoans(myLoans);
                setPagination(paginationData);
                
                // Load chat unread counts for funded loans (optimized bulk call)
                const fundedLoans = myLoans.filter(loan => loan.funded);
                if (fundedLoans.length > 0) {
                    const unreadCounts = await loadChatUnreadCounts(fundedLoans);
                    updateChatUnreadCounts(unreadCounts, true); // Mark as initial load
                }
            } catch (error) {
                console.error("Error loading my loans:", error.message);
                setError(error.message);
            } finally {
                setLoading(false);
            }
        };

        loadMyLoans();
    }, [currentPage]);

    const totalRequested = loans.reduce((sum, loan) => sum + loan.amount, 0);
    const fundedLoans = loans.filter(loan => loan.funded);
    const repaidLoans = loans.filter(loan => loan.repaid);
    const pendingLoans = loans.filter(loan => loan.funded && !loan.repaid);

    // Order loans: newest first by createdAt (fallbacks for legacy fields)
    const orderedLoans = [...loans].sort((a, b) => {
        const aTime = new Date(a.createdAt || a.requestedDate || a.submittedAt || 0).getTime();
        const bTime = new Date(b.createdAt || b.requestedDate || b.submittedAt || 0).getTime();
        return bTime - aTime;
    });

    const getStatusInfo = (loan) => {
        if (loan.repaid) {
            return {
                status: "Repaid",
                color: "green",
                icon: "check-circle"
            };
        } else if (loan.funded) {
            return {
                status: "Repayment Pending",
                color: "yellow",
                icon: "clock"
            };
        } else {
            return {
                status: "Not Funded",
                color: "red",
                icon: "x-circle"
            };
        }
    };

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
                    <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6">
                        <div>
                            <h1 className={`text-2xl sm:text-3xl font-bold ${
                              isDark ? 'text-gray-100' : 'text-gray-900'
                            }`}>My Loan Requests</h1>
                            <p className={`mt-1 sm:mt-2 text-sm sm:text-base ${
                              isDark ? 'text-gray-300' : 'text-gray-600'
                            }`}>Track your loan requests and repayment status</p>
                            
                            {/* Mobile stats - show inline */}
                            <div className="flex md:hidden items-center gap-4 mt-3">
                                <div className="text-center">
                                    <div className="text-lg font-bold text-blue-600">{loans.length}</div>
                                    <div className={`text-xs ${
                                      isDark ? 'text-gray-400' : 'text-gray-500'
                                    }`}>Requests</div>
                                </div>
                                <div className="text-center">
                                    <div className="text-lg font-bold text-purple-600">₹{totalRequested.toLocaleString()}</div>
                                    <div className={`text-xs ${
                                      isDark ? 'text-gray-400' : 'text-gray-500'
                                    }`}>Requested</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Stats Cards */}
                <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6">
                    <div className="hidden md:grid grid-cols-1 md:grid-cols-4 gap-4 sm:gap-6 mb-6 sm:mb-8">
                        <div className={`rounded-lg shadow-sm p-6 border ${
                          isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
                        }`}>
                            <div className="flex items-center">
                                <div className={`p-3 rounded-full ${
                                  isDark ? 'bg-blue-900' : 'bg-blue-100'
                                }`}>
                                    <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                    </svg>
                                </div>
                                <div className="ml-4">
                                    <p className={`text-sm font-medium ${
                                      isDark ? 'text-gray-400' : 'text-gray-500'
                                    }`}>Total Requests</p>
                                    <p className={`text-2xl font-bold ${
                                      isDark ? 'text-gray-100' : 'text-gray-900'
                                    }`}>{loans.length}</p>
                                </div>
                            </div>
                        </div>

                        <div className={`rounded-lg shadow-sm p-6 border ${
                          isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
                        }`}>
                            <div className="flex items-center">
                                <div className={`p-3 rounded-full ${
                                  isDark ? 'bg-purple-900' : 'bg-purple-100'
                                }`}>
                                    <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                                    </svg>
                                </div>
                                <div className="ml-4">
                                    <p className={`text-sm font-medium ${
                                      isDark ? 'text-gray-400' : 'text-gray-500'
                                    }`}>Funded</p>
                                    <p className={`text-2xl font-bold ${
                                      isDark ? 'text-gray-100' : 'text-gray-900'
                                    }`}>{fundedLoans.length}</p>
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
                                    }`}>Repaid</p>
                                    <p className={`text-2xl font-bold ${
                                      isDark ? 'text-gray-100' : 'text-gray-900'
                                    }`}>{repaidLoans.length}</p>
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
                                    }`}>Pending</p>
                                    <p className={`text-2xl font-bold ${
                                      isDark ? 'text-gray-100' : 'text-gray-900'
                                    }`}>{pendingLoans.length}</p>
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
                            }`}>Your Loan History</h2>
                        </div>

                        {loading ? (
                            <div className="flex justify-center items-center py-12">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
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
                                }`}>No loan requests yet</h3>
                                <p className={isDark ? 'text-gray-400' : 'text-gray-500'}>Create your first loan request to get started</p>
                            </div>
                        ) : (
                            <div className={`divide-y ${
                              isDark ? 'divide-gray-700' : 'divide-gray-200'
                            }`}>
                                {orderedLoans.map((loan) => {
                                    const statusInfo = getStatusInfo(loan);
                                                                        const requestedTs = loan.requestedDate || loan.createdAt || loan.submittedAt || loan.updatedAt;
                                                                        const requestedDateObj = requestedTs ? new Date(requestedTs) : null;
                                                                        const requestedDateStr = requestedDateObj ? requestedDateObj.toLocaleDateString('en-IN') : null;
                                                                        // Relative time helper (days ago)
                                                                        let relativeStr = '';
                                                                        if (requestedDateObj) {
                                                                            const now = new Date();
                                                                            const diffMs = now - requestedDateObj;
                                                                            const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
                                                                            if (days === 0) relativeStr = ' (today)';
                                                                            else if (days === 1) relativeStr = ' (1 day ago)';
                                                                            else relativeStr = ` (${days} days ago)`;
                                                                        }
                                    return (
                                        <div key={loan._id} className={`p-3 sm:p-6 transition-colors ${
                                          isDark ? 'hover:bg-gray-700' : 'hover:bg-gray-50'
                                        }`}>
                                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-start sm:items-center space-x-3">
                                                        <div className="flex-shrink-0">
                                                            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                                                              isDark ? 'bg-purple-900' : 'bg-purple-100'
                                                            }`}>
                                                                <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                                                                </svg>
                                                            </div>
                                                        </div>
                                                        <div className="min-w-0 flex-1">
                                                                                                                        <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-3">
                                                                                                                                <h3 className={`text-base sm:text-lg font-medium truncate ${
                                                                                                                                    isDark ? 'text-gray-200' : 'text-gray-900'
                                                                                                                                }`}>{loan.purpose}</h3>
                                                                                                                                {loan.amount !== undefined && loan.amount !== null ? (
                                                                                                                                    <span
                                                                                                                                        aria-label={`Loan amount ₹${Number(loan.amount).toLocaleString('en-IN')}`}
                                                                                                                                        className="text-lg sm:text-xl font-semibold text-purple-600 mt-1 sm:mt-0"
                                                                                                                                    >
                                                                                                                                        ₹{Number(loan.amount).toLocaleString('en-IN')}
                                                                                                                                    </span>
                                                                                                                                ) : (
                                                                                                                                    <span className="text-xs italic opacity-60" aria-label="Loan amount unavailable">—</span>
                                                                                                                                )}
                                                                                                                        </div>
                                                                                                                        <div className={`mt-1 flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-1 sm:gap-x-6 sm:gap-y-2 text-xs sm:text-sm ${
                                                              isDark ? 'text-gray-400' : 'text-gray-500'
                                                            }`}>
                                                                <span className="flex items-center">
                                                                    <svg className="w-4 h-4 mr-1 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                                    </svg>
                                                                                                                                        <span className="hidden sm:inline">Requested:&nbsp;</span>
                                                                                                                                        {requestedDateStr ? (
                                                                                                                                            <span
                                                                                                                                                aria-label={"Requested date " + requestedDateStr}
                                                                                                                                                className={`${isDark ? 'text-gray-300' : 'text-gray-700'} font-medium`}
                                                                                                                                            >
                                                                                                                                                {requestedDateStr}
                                                                                                                                                <span className={`ml-1 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>{relativeStr}</span>
                                                                                                                                            </span>
                                                                                                                                        ) : (
                                                                                                                                            <span className="italic opacity-70" aria-label="Requested date unavailable">date unavailable</span>
                                                                                                                                        )}
                                                                                                                                </span>
                                                                {loan.funded && loan.lender && (
                                                                    <span className="flex items-center truncate">
                                                                        <svg className="w-4 h-4 mr-1 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                                                        </svg>
                                                                        Lender: {loan.lender}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="flex items-center space-x-2 sm:flex-shrink-0">
                                                    {loan.funded && (
                                                        <button
                                                            onClick={() => navigate(`/chat/${loan._id}`)}
                                                            className={`relative inline-flex items-center px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-colors flex-1 sm:flex-initial justify-center ${
                                                              isDark 
                                                                ? 'bg-blue-900 text-blue-200 hover:bg-blue-800' 
                                                                : 'bg-blue-100 text-blue-800 hover:bg-blue-200'
                                                            }`}
                                                        >
                                                            <MessageCircle className="w-4 h-4 sm:mr-1" />
                                                            <span className="hidden sm:inline">Chat</span>
                                                            {chatUnreadCounts[loan._id] > 0 && (
                                                                <span className="absolute -top-1 -right-1 inline-flex items-center justify-center px-1.5 py-0.5 text-xs font-bold leading-none text-white bg-red-500 rounded-full">
                                                                    {chatUnreadCounts[loan._id] > 99 ? '99+' : chatUnreadCounts[loan._id]}
                                                                </span>
                                                            )}
                                                        </button>
                                                    )}
                                                    <div className={`inline-flex items-center px-2 sm:px-3 py-1 sm:py-1.5 rounded-full text-xs sm:text-sm font-medium ${
                                                        statusInfo.color === 'green' 
                                                          ? (isDark ? 'bg-green-900 text-green-200' : 'bg-green-100 text-green-800')
                                                          : statusInfo.color === 'yellow' 
                                                            ? (isDark ? 'bg-yellow-900 text-yellow-200' : 'bg-yellow-100 text-yellow-800')
                                                            : (isDark ? 'bg-red-900 text-red-200' : 'bg-red-100 text-red-800')
                                                    }`}>
                                                        {statusInfo.icon === 'check-circle' && (
                                                            <svg className="w-4 h-4 sm:mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                            </svg>
                                                        )}
                                                        {statusInfo.icon === 'clock' && (
                                                            <svg className="w-4 h-4 sm:mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                            </svg>
                                                        )}
                                                        {statusInfo.icon === 'x-circle' && (
                                                            <svg className="w-4 h-4 sm:mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                            </svg>
                                                        )}
                                                        <span className="hidden sm:inline">{statusInfo.status}</span>
                                                        <span className="sm:hidden">
                                                          {statusInfo.status === 'Repaid' ? '✓' : 
                                                           statusInfo.status === 'Repayment Pending' ? '⏳' : 
                                                           '✗'}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                        
                        {/* Pagination Controls */}
                        {pagination && pagination.totalPages > 1 && (
                            <div className="mt-6 sm:mt-8 flex justify-center items-center space-x-3 sm:space-x-4 px-3 pb-3">
                                <button
                                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                                    disabled={!pagination.hasPrev}
                                    className={`px-3 sm:px-4 py-2 rounded-lg text-sm sm:text-base ${
                                        pagination.hasPrev
                                            ? 'bg-blue-600 text-white hover:bg-blue-700'
                                            : isDark 
                                                ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                                                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                    }`}
                                >
                                    <span className="hidden sm:inline">Previous</span>
                                    <span className="sm:hidden">Prev</span>
                                </button>
                                
                                <span className={`text-sm sm:text-base ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                                    <span className="hidden sm:inline">Page </span>{pagination.currentPage} of {pagination.totalPages}
                                </span>
                                
                                <button
                                    onClick={() => setCurrentPage(prev => Math.min(pagination.totalPages, prev + 1))}
                                    disabled={!pagination.hasNext}
                                    className={`px-3 sm:px-4 py-2 rounded-lg text-sm sm:text-base ${
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