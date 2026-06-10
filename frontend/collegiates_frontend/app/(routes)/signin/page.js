"use client";

import { AuthPanel } from "@/app/components/authPanel";
import { Button } from "@/app/components/button";
import { ShortAnswer } from "@/app/components/formComponents";
import { useState } from "react";
import { UserLayout } from "@/app/layouts/layouts";
import axios from "@/axios/axios";
import useCsrf from "@/hooks/useCsrf";
import { setJwt } from "@/lib/slices/jwt";
import { useAppDispatch} from "@/lib/hooks";

export default function SignIn() {
  
  const [formData, setFormData] = useState({});
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const dispatch = useAppDispatch();


  const validate = (name, value) => {
    if (!(name == "email")) return "";
    if (!value) return "Email is required";
    if (!/\S+@\S+\.\S+/.test(value)) return "Invalid email address";
    return "";
  }

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prevData) => ({
      ...prevData,
      [name]: value,
    }));

    setErrors((prevErrors) => ({
      ...prevErrors,
      [name]: validate(name, value),
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const requiredFields = ["email", "password"];

    const allErrors = {};
    requiredFields.forEach((name) => {
      const error = validate(name, formData[name]);
      if (error) allErrors[name] = error;
    });

    if (Object.keys(allErrors).length > 0) {
      setErrors(allErrors);
      return;
    }

    setLoading(true);
    
    const payload = {
        ...formData,
        grad_date: formData.grad_date ? `${formData.grad_date}-01` : ""
      };

    axios
        .post("/auth/jwt/create/", payload, {
        mode: "cors",
        credentials: "include",
      })
        .then((res)=>{
          console.log(res.data);
          dispatch(setJwt(res.data.access));
          console.log("Sign In succsessful")
          setError("");
      });
        // .catch((err)=>{
        //   setError(err.response?.data?.detail? err.response.data.detail : "Sign In failed");
        // });
    setLoading(false);
  };

  useCsrf();

  return (
    <UserLayout>
      <div
        id="bg-component"
        className="bg-secondary h-screen w-full skew-y-6 absolute -top-[50svh] left-0 -z-20"
      ></div>
      <AuthPanel
        bottomLink="Sign Up"
        bottomLabel="Don't have an account? "
        onSubmit={handleSubmit}
        title="Sign In"
      >
        {error && <div className="text-red-500 mb-4">{error}</div>}
        <ShortAnswer
          type="email"
          name="email"
          label="Email*"
          onChange={handleChange}
          value={formData.email || ""}
          required
        />
        <ShortAnswer
          type="password"
          name="password"
          label="Password*"
          onChange={handleChange}
          value={formData.password || ""}
          required
        />
        <div className="flex">
          <div className="flex-col flex-1"></div>
          <div className="flex-box">
            <button 
              onClick={handleSubmit}
              type="submit"
              disabled={loading}
              className="self-stretch mb-20">
              <Button>{loading ? "Signing in..." : "Sign In"}</Button>
            </button>
          </div>
        </div>
      </AuthPanel>
    </UserLayout>
  );
}
