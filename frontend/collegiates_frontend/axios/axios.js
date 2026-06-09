import axios from "axios";

axios.defaults.xsrfCookieName = 'csrftoken';
axios.defaults.xsrfHeaderName = 'X-CSRFToken';
axios.defaults.withXSRFToken = true;
axios.defaults.withCredentials = true; 
axios.defaults.headers.common['Accept'] = '*/*';

export default axios.create({
    baseURL: 'http://localhost:8000/collegiates_app',
    xsrfCookieName: 'csrftoken',
    xsrfHeaderName: 'X-CSRFToken'
});