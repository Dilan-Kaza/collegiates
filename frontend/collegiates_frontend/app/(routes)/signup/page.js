"use client";

import { AuthPanelWide } from "@/app/components/authPanel";
import { LongButton } from "@/app/components/button";
import {
  DatePicker,
  Dropdown,
  ShortAnswer,
} from "@/app/components/formComponents";
import { useState } from "react";
import { UserLayout } from "@/app/layouts/layouts";
import axios from "@/axios/axios";
import { useCsrf, useColleges} from "@/hooks/publicApiHooks";
import { useRouter } from "next/navigation";
import { useAppDispatch } from "@/lib/hooks";
import { setSuccessMsg } from "@/lib/slices/success";
import { validate, handleFormBlur, handleFormChange } from "@/app/handlers/forms";


export default function Signup() {
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

  const router = useRouter();

  const [formData, setFormData] = useState({});
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const dispatch = useAppDispatch();

  const checkEmailExists = async (email) => {
    if (!email || !/\S+@\S+\.\S+/.test(email)) return;
    try {
      const res = await fetch(`http://localhost:8000/collegiates_app/check-email/?email=${encodeURIComponent(email)}`, {
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

  const handleChange = handleFormChange(setFormData,setErrors);
  const handleBlur = handleFormBlur(setErrors, formData);

  const handleEmailBlur = (e) => {
    const { name, value } = e.target;
            setErrors((prevErrors) => ({
                ...prevErrors,
                [name]: validate(name, value),
            }));
    if (name === "email") checkEmailExists(value);
  };

  useCsrf();
  const colleges = useColleges();


  const handleSubmit = async (e) => {
    e.preventDefault();

    const requiredFields = ["email", "password", "re_password", "first_name", "last_name", "first_comp", "grad_date", "skill_level", "school", "gender", "student_type"];

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

    // Prepare JSON payload
    const payload = {
      ...formData,
      grad_date: formData.grad_date ? `${formData.grad_date}-01` : ""
    };

    axios
        .post("/auth/users/", payload, {
        mode: "cors",
        withCredentials: true,
        credentials: "include",
      })
        .then((res)=>{
          // console.log("Registration successful");
          setError("");
          dispatch(setSuccessMsg("Account created successfully"));
          router.push('/signin'); 

      })
        .catch((err)=>{
          console.log("Status:", err.status);
          console.log("Full error response:", JSON.stringify(err.response.data, null, 2));
          
          // Handle field-specific errors from DRF serializer
          if (err.response.data) {
            // Transform DRF error format to match your state structure
            const transformedErrors = {};
            Object.entries(err.response.data).forEach(([field, messages]) => {
              // DRF returns arrays of error messages, take the first one
              transformedErrors[field] = Array.isArray(messages) ? messages[0] : messages;
            });
            setErrors(transformedErrors);
          }
          
          setError(err.response?.data? "Please fix the errors below" : "Registration failed");
        });
    setLoading(false);
  };


  return (
    <UserLayout>
      <div
        id="bg-component"
        className="bg-primary h-screen w-full skew-y-10 absolute -top-[60svh] left-0 -z-20"
      ></div>
      {
        <AuthPanelWide
          bottomLabel="Already have an account? "
          bottomLink="Sign In"
          onSubmit={handleSubmit}
          title="Create an Account"
        >
          <div className="flex row gap-15">
            <div className="flex flex-col flex-1 gap-4">
              {error && <div className="text-red-500 mb-4">{error}</div>}
              <ShortAnswer
                type="email"
                name="email"
                label="Email*"
                onChange={handleChange}
                onBlur={handleEmailBlur}
                value={formData.email || ""}
                required
              />
              {errors.email && (
                <p className="text-red-500 text-sm -mt-2">{errors.email}</p>
              )}
              <ShortAnswer
                type="password"
                name="password"
                label="Password*"
                minLength={8}
                onChange={handleChange}
                onBlur={handleBlur}
                value={formData.password || ""}
                required
              />
              {errors.password && (
                <p className="text-red-500 text-sm -mt-2">{errors.password}</p>
              )}
              <ShortAnswer
                type="password"
                name="re_password"
                label="Confirm Password*"
                minLength={8}
                onChange={handleChange}
                onBlur={handleBlur}
                value={formData.re_password || ""}
                required
              />
              {errors.re_password && (
                <p className="text-red-500 text-sm -mt-2">{errors.re_password}</p>
              )}
            </div>
            <div className="flex flex-col flex-1 gap-4">
              <div className="flex gap-4">
                <div className="flex flex-col flex-1">
                  <ShortAnswer
                    type="text"
                    name="first_name"
                    label="First Name*"
                    onChange={handleChange}
                    onBlur={handleBlur}
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
                    onBlur={handleBlur}
                    value={formData.last_name || ""}
                    required
                  />
                  {errors.last_name && (
                    <p className="text-red-500 text-sm mt-1">{errors.last_name}</p>
                  )}
                </div>
              </div>
                <div className="flex justify-between gap-4">
                  <div className="flex flex-col flex-1">
                    <ShortAnswer
                      label="First Competition Year*"
                      type="number"
                      name="first_comp"
                      min="1900"
                      max="9999"
                      onChange={handleChange}
                      onBlur={handleBlur}
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
                      onBlur={handleBlur}
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
                  onBlur={handleBlur}
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
                  onBlur={handleBlur}
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
                      onBlur={handleBlur}
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
                      onBlur={handleBlur}
                      value={formData.student_type || ""}
                      required
                    />
                    {errors.student_type && (
                      <p className="text-red-500 text-sm mt-1">{errors.student_type}</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
            <button
              onClick={handleSubmit}
              type="submit"
              disabled={loading}
              className="self-stretch mb-20"
            >
              <LongButton>{loading ? "Signing up..." : "Submit"}</LongButton>
            </button>
          </AuthPanelWide>
      }
    </UserLayout>
  );
}