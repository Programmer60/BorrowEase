import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { MessageCircle } from "lucide-react";
import Navbar from "./Navbar";
import { getMyLoans } from "../api/loanApi";
import { loadChatUnreadCounts } from "../api/chatApi";
import API from "../api/api";

export default function BorrowerHistory () {
    const [loans, setLoans] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [chatUnreadCounts, setChatUnreadCounts] = useState({});
    const [pagination, setPagination] = useState(null);
    const [currentPage, setCurrentPage] = useState(1);
    const navigate = useNavigate();

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
                    setChatUnreadCounts(unreadCounts);
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

    // Remove the old sequential loadChatUnreadCounts function since we're using the optimized one from chatApi

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
            <div className="min-h-screen bg-gray-50">
                {/* Header Section */}
                <div className="bg-white shadow-sm border-b">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <h1 className="text-3xl font-bold text-gray-900">My Loan Requests</h1>
                                <p className="mt-2 text-gray-600">Track your loan requests and repayment status</p>
                            </div>
                            <div className="hidden md:flex items-center space-x-4">
                                <div className="text-center">
                                    <div className="text-2xl font-bold text-blue-600">{loans.length}</div>
                                    <div className="text-sm text-gray-500">Total Requests</div>
                                </div>
                                <div className="text-center">
                                    <div className="text-2xl font-bold text-purple-600">₹{totalRequested.toLocaleString()}</div>
                                    <div className="text-sm text-gray-500">Total Requested</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Stats Cards */}
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                        <div className="bg-white rounded-lg shadow-sm p-6 border">
                            <div className="flex items-center">
                                <div className="p-3 bg-blue-100 rounded-full">
                                    <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                    </svg>
                                </div>
                                <div className="ml-4">
                                    <p className="text-sm font-medium text-gray-500">Total Requests</p>
                                    <p className="text-2xl font-bold text-gray-900">{loans.length}</p>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white rounded-lg shadow-sm p-6 border">
                            <div className="flex items-center">
                                <div className="p-3 bg-purple-100 rounded-full">
                                    <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                                    </svg>
                                </div>
                                <div className="ml-4">
                                    <p className="text-sm font-medium text-gray-500">Funded</p>
                                    <p className="text-2xl font-bold text-gray-900">{fundedLoans.length}</p>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white rounded-lg shadow-sm p-6 border">
                            <div className="flex items-center">
                                <div className="p-3 bg-green-100 rounded-full">
                                    <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                </div>
                                <div className="ml-4">
                                    <p className="text-sm font-medium text-gray-500">Repaid</p>
                                    <p className="text-2xl font-bold text-gray-900">{repaidLoans.length}</p>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white rounded-lg shadow-sm p-6 border">
                            <div className="flex items-center">
                                <div className="p-3 bg-yellow-100 rounded-full">
                                    <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                </div>
                                <div className="ml-4">
                                    <p className="text-sm font-medium text-gray-500">Pending</p>
                                    <p className="text-2xl font-bold text-gray-900">{pendingLoans.length}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Loans List */}
                    <div className="bg-white rounded-lg shadow-sm border">
                        <div className="px-6 py-4 border-b border-gray-200">
                            <h2 className="text-xl font-semibold text-gray-900">Your Loan History</h2>
                        </div>

                        {loading ? (
                            <div className="flex justify-center items-center py-12">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
                                <span className="ml-2 text-gray-600">Loading your loans...</span>
                            </div>
                        ) : error ? (
                            <div className="text-center py-12">
                                <div className="text-red-600 mb-2">
                                    <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                </div>
                                <p className="text-gray-600">Error loading loans: {error}</p>
                            </div>
                        ) : loans.length === 0 ? (
                            <div className="text-center py-12">
                                <div className="text-gray-400 mb-4">
                                    <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                    </svg>
                                </div>
                                <h3 className="text-lg font-medium text-gray-900 mb-2">No loan requests yet</h3>
                                <p className="text-gray-500">Create your first loan request to get started</p>
                            </div>
                        ) : (
                            <div className="divide-y divide-gray-200">
                                {orderedLoans.map((loan) => {
                                    const statusInfo = getStatusInfo(loan);
                                    return (
                                        <div key={loan._id} className="p-6 hover:bg-gray-50 transition-colors">
                                            <div className="flex items-center justify-between">
                                                <div className="flex-1">
                                                    <div className="flex items-center space-x-3">
                                                        <div className="flex-shrink-0">
                                                            <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                                                                <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                                                                </svg>
                                                            </div>
                                                        </div>
                                                        <div className="min-w-0 flex-1">
                                                            <div className="flex items-center space-x-2">
                                                                <h3 className="text-lg font-medium text-gray-900 truncate">{loan.purpose}</h3>
                                                                <span className="text-xl font-bold text-purple-600">₹{loan.amount.toLocaleString()}</span>
                                                            </div>
                                                            <div className="mt-1 flex items-center space-x-4 text-sm text-gray-500">
                                                                <span className="flex items-center">
                                                                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                                    </svg>
                                                                    Requested: {loan.requestedDate}
                                                                </span>
                                                                {loan.funded && loan.lender && (
                                                                    <span className="flex items-center">
                                                                        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                                                        </svg>
                                                                        Lender: {loan.lender}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="flex-shrink-0 ml-4 flex items-center space-x-2">
                                                    {loan.funded && (
                                                        <button
                                                            onClick={() => navigate(`/chat/${loan._id}`)}
                                                            className="relative inline-flex items-center px-3 py-1 rounded-lg text-sm font-medium bg-blue-100 text-blue-800 hover:bg-blue-200 transition-colors"
                                                        >
                                                            <MessageCircle className="w-4 h-4 mr-1" />
                                                            Chat
                                                            {chatUnreadCounts[loan._id] > 0 && (
                                                                <span className="absolute -top-1 -right-1 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white bg-red-500 rounded-full">
                                                                    {chatUnreadCounts[loan._id] > 99 ? '99+' : chatUnreadCounts[loan._id]}
                                                                </span>
                                                            )}
                                                        </button>
                                                    )}
                                                    <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                                                        statusInfo.color === 'green' ? 'bg-green-100 text-green-800' :
                                                        statusInfo.color === 'yellow' ? 'bg-yellow-100 text-yellow-800' :
                                                        'bg-red-100 text-red-800'
                                                    }`}>
                                                        {statusInfo.icon === 'check-circle' && (
                                                            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                            </svg>
                                                        )}
                                                        {statusInfo.icon === 'clock' && (
                                                            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                            </svg>
                                                        )}
                                                        {statusInfo.icon === 'x-circle' && (
                                                            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                            </svg>
                                                        )}
                                                        {statusInfo.status}
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
                            <div className="mt-8 flex justify-center items-center space-x-4">
                                <button
                                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                                    disabled={!pagination.hasPrev}
                                    className={`px-4 py-2 rounded-lg ${
                                        pagination.hasPrev
                                            ? 'bg-blue-600 text-white hover:bg-blue-700'
                                            : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                    }`}
                                >
                                    Previous
                                </button>
                                
                                <span className="text-gray-600">
                                    Page {pagination.currentPage} of {pagination.totalPages}
                                </span>
                                
                                <button
                                    onClick={() => setCurrentPage(prev => Math.min(pagination.totalPages, prev + 1))}
                                    disabled={!pagination.hasNext}
                                    className={`px-4 py-2 rounded-lg ${
                                        pagination.hasNext
                                            ? 'bg-blue-600 text-white hover:bg-blue-700'
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