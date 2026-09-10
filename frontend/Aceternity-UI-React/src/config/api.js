// Centralized API configuration
// Reads the backend URL from environment variables, removing any accidental trailing slashes.
const API_BASE_URL = (
  process.env.REACT_APP_API_URL ||
  process.env.REACT_APP_BACKEND_URL ||
  'http://localhost:80'
).replace(/\/+$/, '');

export default API_BASE_URL;
export { API_BASE_URL };
