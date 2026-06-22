import axios from "@/axios/axios";
import { setJwt } from "@/lib/slices/jwt";
import { useAppDispatch, useAppSelector } from "@/lib/hooks";
import { useEffect } from "react";


const useRefreshToken = () => {
    const access = useAppSelector((state)=>state.jwt.access);
    
    useEffect(() => {
        const getNewTok = async () => {
            axios
                .post("/auth/jwt/refresh", {
                    withCredentials: true
                })
                .then((res)=>{
                    console.log(res.data);
                    dispatch(setJwt(res.data.access));
                    console.log("Signed In")
                })
                .catch((err)=>{
                    console.log("not signed in");
                });
            }
        
        getNewTok();


    }, []);
}

export default useRefreshToken;