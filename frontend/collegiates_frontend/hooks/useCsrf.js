import { useEffect } from "react";
import axios from "@/axios/axios";


export default function useCsrf(){

    const getCsrfToken = () => {

        const name = "csrftoken";
        let cookieValue = null;
        if (document.cookie && document.cookie !== "") {
            const cookies = document.cookie.split(";");
            for (let i = 0; i < cookies.length; i++) {
                const cookie = cookies[i].trim();
                if (cookie.substring(0, name.length + 1) === name + "=") {
                    cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                    break;
                }
            }
        }
    };

  useEffect(() => {
    axios
        .get("/csrf/", {
            mode: "cors",
            credentials: "include",
        })
        .then(() => getCsrfToken())
        .catch(() => console.warn("Could not fetch CSRF token"));

  },[]);
}