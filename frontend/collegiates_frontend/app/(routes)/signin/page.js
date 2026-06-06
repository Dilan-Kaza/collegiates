"use client";

import { AuthPanel } from "@/app/components/authPanel";
import { Button } from "@/app/components/button";
import { ShortAnswer } from "@/app/components/formComponents";
import { useEffect, useState } from "react";
import { MtHeader } from "@/app/layouts/headers";
import { UserLayout } from "@/app/layouts/user";
import { NavBar } from "@/app/components/navbar";

export default function SignIn() {
  
  const [formData, setFormData] = useState({});
  const [csrfToken, setCsrfToken] = useState("");
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");


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
    return cookieValue;
  };

  useEffect(() => {
      const init = async () => {
        // hit the CSRF endpoint so Django sets the csrftoken cookie
        try {
          await fetch("http://localhost:8000/collegiates_app/csrf/", {
            mode: "cors",
            credentials: "include",
          });
        } catch {
          console.warn("Could not fetch CSRF token");
        }
  
        // set csrf token
        const token = getCsrfToken();
        setCsrfToken(token);

        setCsrfToken(getCsrfToken());
      };
  
      init();
    }, []);

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

    try {
      // Prepare JSON payload
      const payload = {
        ...formData
      };
      const headers = {
        "Content-Type": "application/json",
      };
      
      if (csrfToken) {
        headers["X-CSRFToken"] = csrfToken;
      }

      console.log(payload)

      const resp = await fetch("http://localhost:8000/collegiates_app/auth/jwt/create/", {
        method: "POST",
        mode: "cors",
        credentials: "include",
        headers: headers,
        body: JSON.stringify(payload),
      });

      let data;
      try { 
        data = await resp.json(); 
      } catch { 
        data = null; 
      }

      if (!resp.ok) {
        console.log("Status:", resp.status);
        console.log("Full error response:", JSON.stringify(data, null, 2));
        
        // Handle field-specific errors from DRF serializer
        if (data && data.errors) {
          // Transform DRF error format to match your state structure
          const transformedErrors = {};
          Object.entries(data.errors).forEach(([field, messages]) => {
            // DRF returns arrays of error messages, take the first one
            transformedErrors[field] = Array.isArray(messages) ? messages[0] : messages;
          });
          setErrors(transformedErrors);
        }
        
        setError(data?.errors ? "Please fix the errors below" : "Registration failed");
      } else {
        console.log("Registration successful", data);
        setError("");
        // Success! data.success === true and data.user_id is available
        // TODO: redirect to signin or dashboard
        // Example: router.push('/signin');
        // Or show success message
      }
    } catch (err) {
      setError("Network error. Please try again.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <UserLayout navBar={<NavBar/>} header={<MtHeader/>}>
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
        {errors.email && (
                <p className="text-red-500 text-sm -mt-2">{errors.email}</p>
              )}
        <ShortAnswer
          type="email"
          name="email"
          label="Email*"
          onChange={handleChange}
          value={formData.email || ""}
          required
        />
        {errors.password && (
                <p className="text-red-500 text-sm -mt-2">{errors.password}</p>
              )}
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
