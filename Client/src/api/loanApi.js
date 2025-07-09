import API from "./api";

// Create loan request
export const createLoanRequest = (loanData) => API.post("/loans", loanData);

// Get all loan requests

export const getLoanRequests = async () => {
  const res = await API.get("/loans");
  return res.data;
};

// Fund a loan
export const fundLoan = (loanId) => API.patch(`/loans/${loanId}/fund`);

// Get loans for the logged-in user
export const getMyLoans = async () => {
  const res = await API.get("/loans/my-loans");
  return res.data;
};

// Get funded loans by the lender
export const getFundedLoans = async () => {
  const res = await API.get("/loans/funded");
  return res.data;
};