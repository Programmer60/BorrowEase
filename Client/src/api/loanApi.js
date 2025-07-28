import API from "./api";

// Create loan request
export const createLoanRequest = (loanData) => API.post("/loans", loanData);

// Get all loan requests

export const getLoanRequests = async () => {
  try {
    const response = await API.get("/loans");
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.error || "Failed to fetch loan requests");
  }
};

// Fund a loan
export const fundLoan = (loanId) => API.patch(`/loans/${loanId}/fund`);

// Get loans for the logged-in user
export const getMyLoans = async (page = 1, limit = 20) => {
  try {
    const response = await API.get(`/loans/my-loans?page=${page}&limit=${limit}`);
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.error || "Failed to fetch my loans");
  }
};

// Get funded loans by the lender
export const getFundedLoans = async (page = 1, limit = 20) => {
  try {
    const response = await API.get(`/loans/funded?page=${page}&limit=${limit}`);
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.error || "Failed to fetch funded loans");
  }
};
