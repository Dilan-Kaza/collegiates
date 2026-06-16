import { useEffect } from "react";
import axios from "@/axios/axios";


export default function useCsrf(){

  useEffect(() => {
    const csrf = async () => {
        axios
            .get("/csrf/", {
                mode: "cors",
                withCredentials: true,
                credentials: "include",
            })
            .catch(() => console.warn("Could not fetch CSRF token"));
    };

    csrf();

  },[]);
}