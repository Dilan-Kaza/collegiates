import axios from "@/axios/axios";
import { useAppSelector } from "@/lib/hooks";
import { useEffect, useState } from "react";

function useCurrentUser(){

    const [userInfo, setUserInfo] = useState({});

    const access = useAppSelector((state)=>state.jwt.access);
    console.log(access);

  useEffect(() => {

    const getMe = async () => {

        axios
            .get("/auth/users/me", {
                mode: "cors",
                withCredentials: true,
                credentials: "include",
                headers: {
                    Authorization: `Bearer ${access}`,
                }
            })
            .then((res) => setUserInfo(res.data))
            .catch(() => console.warn("not logged in"));
    }
    if (access !== "") {
        getMe();
    }

  },[access]);

  return userInfo;
}

export { useCurrentUser };