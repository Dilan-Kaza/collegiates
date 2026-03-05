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

export default function Register() {
  // choices mirror the enums defined in models.py
  const skillLevels = { Beginner: "B", Intermediate: "I", Advanced: "A" };
  const genderChoices = { Male: "M", Female: "F" };
  const studentTypes = {
    "Full/Part-Time Undergraduate": "1",
    "Full-Time Graduate/Professional School": "2",
    "Fall/Winter Graduate": "3",
    "Non-Enrolled Student": "4",
    "1yr Alumni": "5",
    "Part-Time Graduate": "6",
    "International Student": "7",
  };

  const [colleges, setColleges] = useState({});
  const [formData, setFormData] = useState({});
  const [nextPage, setNextPage] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [csrfToken, setCsrfToken] = useState("");

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

  const REGISTER_URL = "http://localhost:8000/collegiates_app/register/";

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const payload = new FormData();
      Object.entries(formData).forEach(([k, v]) => payload.append(k, v || ""));

      const headers = {};
      if (csrfToken) {
        headers["X-CSRFToken"] = csrfToken;
      }

      const resp = await fetch(REGISTER_URL, {
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
            label="Email"
            onChange={handleChange}
            value={formData.email || ""}
            required
          />
          <ShortAnswer
            type="password"
            name="password1"
            label="Password"
            minLength={8}
            onChange={handleChange}
            value={formData.password1 || ""}
            required
          />
          <ShortAnswer
            type="password"
            name="password2"
            label="Confirm Password"
            minLength={8}
            onChange={handleChange}
            value={formData.password2 || ""}
            required
          />
          <div className="flex gap-4">
            <ShortAnswer
              type="text"
              name="first_name"
              label="First Name"
              onChange={handleChange}
              value={formData.first_name || ""}
              required
            />
            <ShortAnswer
              type="text"
              name="last_name"
              label="Last Name"
              onChange={handleChange}
              value={formData.last_name || ""}
              required
            />
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
              <div className="flex justify-between">
              <ShortAnswer
                label="First Competition Year"
                type="number"
                name="first_comp"
                min="1900"
                max="9999"
                onChange={handleChange}
                value={formData.first_comp || ""}
                className="w-40"
                required
              />
              <DatePicker
                label="Graduation Date"
                name="grad_date"
                onChange={handleChange}
                value={formData.grad_date || ""}
                className="w-40"
                required
              />
            </div>
            <Dropdown
              options={skillLevels}
              label="Experience Level"
              name="skill_level"
              onChange={handleChange}
              value={formData.skill_level || ""}
              required
            />
            <Dropdown
              options={colleges}
              label="College"
              name="school"
              onChange={handleChange}
              value={formData.school || ""}
              required
            />
            <div className="flex justify-between gap-2">
              <Dropdown
                options={genderChoices}
                label="Gender"
                name="gender"
                onChange={handleChange}
                value={formData.gender || ""}
                required
              />

              <Dropdown
                options={studentTypes}
                label="Student Type"
                name="student_type"
                onChange={handleChange}
                value={formData.student_type || ""}
                required
              />
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
