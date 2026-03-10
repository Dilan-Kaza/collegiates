"use client";

import { AuthPanel } from "@/app/components/authPanel";
import { Button, LongButton } from "@/app/components/button";
import {
  DatePicker,
  Dropdown,
  ShortAnswer,
} from "@/app/components/formComponents";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Ewert } from "next/font/google";

export default function Register() {
  // choices mirror the enums defined in models.py
  const skillLevels = { Beginner: "B", Intermediate: "I", Advanced: "A" };
  const genderChoices = { Male: "M", Female: "F" };
  const studentTypes = {
    "Full/Part-Time Undergraduate Student": "1",
    "Full-Time Graduate/Professional School Student": "2",
    "Early Graduate Of Current Year": "3",
    "Non-Enrolled Student": "4",
    "One Year Alumni": "5",
    "Part-Time Graduate Student": "6",
    "International Student": "7",
  };

  const [colleges, setColleges] = useState({});
  const [formData, setFormData] = useState({});
  const [nextPage, setNextPage] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [csrfToken, setCsrfToken] = useState("");
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [emailExists, setEmailExists] = useState(false);

  const validate = (name, value) => {
    switch(name) {
      case "email":
        if (!value) return "Email is required";
        if (!/\S+@\S+\.\S+/.test(value)) return "Invalid email address";
        return "";
      case "password1":
        if (!value) return "Password is required";
        if (value.length < 8) return "Password must be at least 8 characters";
        return "";
      case "password2":
        if (!value) return "Please confirm your password";
        if (value != formData.password1) return "Passwords do not match";
        return "";
      case "first_name":
        if (!value) return "Required";
        return "";
      case "last_name":
        if (!value) return "Required";
        return "";
      case "first_comp":
        if (!value) return "Please provide year of first competition";
        if (value < 1900 || value > 9999) return "Invalid year";
        return "";
      case "grad_date":
        if (!value) return "Please provide a graduation date";
        return "";
      case "school":
        if (!value) return "Please select a college";
        return "";
      case "skill_level":
        if (!value) return "Please select an experience level";
        return "";
      case "gender":
        if (!value) return "Please select a gender";
        return "";
      case "student_type":
        if (!value) return "Please select a student type";
        return "";

      default:
        return "";
    }
  }

  const checkEmailExists = async (email) => {
    if (!email || !/\S+@\S+\.\S+/.test(email)) return;
    try {
      const res = await fetch(`http://localhost:8000/collegiates_app/check_email/?email=${encodeURIComponent(email)}`, {
        mode: "cors",
        credentials: "include",
      });
      const data = await res.json();
      if (data.exists) {
        setErrors((prev) => ({ ...prev, email: "An account with this email already exists" }));
      }
    } catch (err) {
      console.warn("Could not check email", err);
    }
  };

  // Helper to extract CSRF token from cookies
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

  const handleBlur = (e) => {
    const { name, value } = e.target;
    if (name === "email") checkEmailExists(value);
  };

  useEffect(() => {
    const init = async () => {
      // hit the CSRF endpoint so Django sets the csrftoken cookie
      try {
        await fetch("http://localhost:8000/csrf/", {
          mode: "cors",
          credentials: "include",
        });
      } catch {
        console.warn("Could not fetch CSRF token");
      }

      // set csrf token
      const token = getCsrfToken();
      setCsrfToken(token);

      try {
        const res = await fetch("http://localhost:8000/collegiates_app/college_data/", {
          mode: "cors",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
        });
        const json = await res.json();
        setColleges(
          Object.fromEntries(
            json.map(({ college_name, college_id }) => [college_name, college_id])
          )
        );
      } catch(err) {
        console.warn("Could not fetch colleges", err);
      }
      setCsrfToken(getCsrfToken());
    };

    init();
  }, []);

  const SIGNUP_URL = "http://localhost:8000/collegiates_app/signup/";

  const handleSubmit = async (e) => {
    e.preventDefault();

    const requiredFields = ["first_comp", "grad_date", "skill_level", "school", "gender", "student_type"];

    const allErrors = {};
    requiredFields.forEach((name) => {
      const error = validate(name, formData[name]);
      if (error) allErrors[name] = error;
    });

    if (Object.keys(allErrors).length > 0) {
      setErrors(allErrors);
      return;
    }

    try {
      const payload = new FormData();
      Object.entries(formData).forEach(([k, v]) => {
        if (k === "grad_date" && v) v = v + "-01"; 
        payload.append(k, v || "");
      });
      const headers = {};
      if (csrfToken) {
        headers["X-CSRFToken"] = csrfToken;
      }

      const resp = await fetch(SIGNUP_URL, {
        method: "POST",
        mode: "cors",
        credentials: "include",
        headers: headers,
        body: payload,
      });

      let data;
      try { data = await resp.json(); } catch { data = null; }

      if (!resp.ok) {
        console.log("Status:", resp.status);
        console.log("Full error response:", JSON.stringify(data, null, 2)); // add this
        setError((data && data.error) || "Registration failed");
      } else {
        console.log("registered", data);
        // TODO redirect to signin or show success
      }
    } catch (err) {
      setError("Network error");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handlePageChange = (e) => {
    if (!nextPage) {
      const requiredFields = ["email", "passsword1", "password2", "first_name", "last_name"]
      const allErrors = {};
      requiredFields.forEach((name) => {
        const error = validate(name, formData[name]);
        if (error) allErrors[name] = error;
      });

      if (Object.keys(allErrors).length > 0) {
        setErrors(allErrors);
        return;
      }
    }
    setNextPage(!nextPage);
  };

  // function onDateChange(timestamp) {
  //   console.log(timestamp);
  // }

  return (
    <>
      {/* <div
        id="bg-component"
        className="bg-secondary h-screen w-full skew-y-6 absolute -top-[50svh] left-0 -z-20"
      ></div> */}
      {!nextPage ? (
        <AuthPanel
          bottomLabel="Already registered? "
          bottomLink="Sign In"
          onSubmit={handleSubmit}
          title="Register"
        >
          {error && <div className="text-red-500 mb-4">{error}</div>}
          <ShortAnswer
            type="email"
            name="email"
            label="Email*"
            onChange={handleChange}
            onBlur={handleBlur}
            value={formData.email || ""}
            required
          />
          {errors.email && (
            <p className="text-red-500 text-sm -mt-2">{errors.email}</p>
          )}
          <ShortAnswer
            type="password"
            name="password1"
            label="Password*"
            minLength={8}
            onChange={handleChange}
            value={formData.password1 || ""}
            required
          />
          {errors.password1 && (
            <p className="text-red-500 text-sm -mt-2">{errors.password1}</p>
          )}
          <ShortAnswer
            type="password"
            name="password2"
            label="Confirm Password*"
            minLength={8}
            onChange={handleChange}
            value={formData.password2 || ""}
            required
          />
          {errors.password2 && (
            <p className="text-red-500 text-sm -mt-2">{errors.password2}</p>
          )}
          <div className="flex gap-4">
            <div className="flex flex-col flex-1">
              <ShortAnswer
                type="text"
                name="first_name"
                label="First Name*"
                onChange={handleChange}
                value={formData.first_name || ""}
                required
              />
              {errors.first_name && (
                <p className="text-red-500 text-sm mt-1">{errors.first_name}</p>
              )}
            </div>
            <div className="flex flex-col flex-1">
              <ShortAnswer
                type="text"
                name="last_name"
                label="Last Name*"
                onChange={handleChange}
                value={formData.last_name || ""}
                required
              />
              {errors.last_name && (
                <p className="text-red-500 text-sm mt-1">{errors.last_name}</p>
              )}
            </div>
          </div>
          <button
            onClick={handlePageChange}
            className="self-stretch mb-24"
            type="button"
          >
            <LongButton>Continue</LongButton>
          </button>
        </AuthPanel>
      ) : (
        <>
          <AuthPanel
            title="Register"
            bottomLabel="Already registered? "
            bottomLink="Sign In"
            onSubmit={handleSubmit}
          >
            <div className="flex justify-between gap-4">
              <div className="flex flex-col flex-1">
                <ShortAnswer
                  label="First Competition Year*"
                  type="number"
                  name="first_comp"
                  min="1900"
                  max="9999"
                  onChange={handleChange}
                  value={formData.first_comp || ""}
                  className="w-40"
                  required
                />
                {errors.first_comp && (
                  <p className="text-red-500 text-sm mt-1">{errors.first_comp}</p>
                )}
              </div>
              <div className="flex flex-col flex-1">
                <DatePicker
                  label="Graduation Date*"
                  name="grad_date"
                  onChange={handleChange}
                  value={formData.grad_date || ""}
                  className="w-40"
                  required
                />
                {errors.grad_date && (
                  <p className="text-red-500 text-sm mt-1">{errors.grad_date}</p>
                )}
              </div>
            </div>
            <Dropdown
              options={skillLevels}
              label="Experience Level*"
              name="skill_level"
              onChange={handleChange}
              value={formData.skill_level || ""}
              required
            />
            {errors.skill_level && (
              <p className="text-red-500 text-sm -mt-2">{errors.skill_level}</p>
            )}
            <Dropdown
              options={colleges}
              label="College*"
              name="school"
              onChange={handleChange}
              value={formData.school || ""}
              required
            />
            {errors.school && (
              <p className="text-red-500 text-sm -mt-2">{errors.school}</p>
            )}
            <div className="flex justify-between gap-2">
              <div className="flex flex-col flex-1">
                <Dropdown
                  options={genderChoices}
                  label="Gender*"
                  name="gender"
                  onChange={handleChange}
                  value={formData.gender || ""}
                  required
                />
                {errors.gender && (
                  <p className="text-red-500 text-sm mt-1">{errors.gender}</p>
                )}
              </div>
              <div className="flex flex-col w-48">
                <Dropdown
                  options={studentTypes}
                  label="Student Type*"
                  name="student_type"
                  onChange={handleChange}
                  value={formData.student_type || ""}
                  required
                />
                {errors.student_type && (
                  <p className="text-red-500 text-sm mt-1">{errors.student_type}</p>
                )}
              </div>
            </div>
            <button onClick={handleSubmit} type="submit" disabled={loading}>
              <LongButton>{loading ? "Registering..." : "Submit"}</LongButton>
            </button>
            <button
              onClick={handlePageChange}
              className="self-stretch mb-20"
              type="button"
            >
              <LongButton>Back</LongButton>
            </button>
          </AuthPanel>
        </>
      )}
    </>
  );
}
