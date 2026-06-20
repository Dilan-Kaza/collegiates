import { clearJwt } from '@/lib/slices/jwt';
import { makeStore } from '@/lib/store';
import axios from "axios";

axios.defaults.xsrfCookieName = 'csrftoken';
axios.defaults.xsrfHeaderName = 'X-CSRFToken';
axios.defaults.withXSRFToken = true;
axios.defaults.headers.common['Accept'] = '*/*';

axios.interceptors.response.use(
  (response) => {
    // Return data directly for successful (2xx) responses
    return response.data;
  },
  (error) => {
    // Handle specific status codes globally
    if (error.response) {
      const status = error.response.status;
      
      if (status === 401) {
        // Example: Redirect to login or refresh token
        console.warn('Unauthorized! Redirecting to login...');
        if (error.response.data && error.response.data.code && error.response.data.code == "token_not_valid"){
            makeStore.dispatch(clearJwt());
        }
      } else if (status === 500) {
        // Example: Show global error notification
        console.error('Server Error!');
      }
    }
    
    // Always reject the promise so individual .catch() blocks still work
    return Promise.reject(error);
  }
);

export default axios.create({
    baseURL: 'http://localhost:8000/collegiates_app',
    xsrfCookieName: 'csrftoken',
    xsrfHeaderName: 'X-CSRFToken'
});