import { useEffect, useState } from "react";
import axios from "@/axios/axios";


export default function useColleges(){

    const [colleges, setColleges] = useState({});
    

    useEffect(() => {
        
        const init = async () => {
        axios
                .get("/college_data/", {
                mode: "cors",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                })
                .then((response) => setColleges(
                Object.fromEntries(
                    response.data.map(({ college_name, college_id }) => [college_name, college_id])
                )
                ))
                .catch((err) => console.warn("Could not fetch colleges", err));
        };

        init();
    }, []);

    return colleges;
}