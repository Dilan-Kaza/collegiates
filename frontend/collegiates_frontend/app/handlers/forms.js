const validate = (name, value, formData) => {
    switch(name) {
      case "email":
        if (!value) return "Email is required";
        if (!/\S+@\S+\.\S+/.test(value)) return "Invalid email address";
        return "";
      case "password":
        if (!value) return "Password is required";
        if (value.length < 8) return "Password must be at least 8 characters";
        return "";
      case "re_password":
        if (!value) return "Please confirm your password";
        if (value != formData.password) return "Passwords do not match";
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

function handleFormChange(setData,setErrors) {
    return (
        (e) => {
            const { name, value } = e.target;
            setData((prevData) => ({
            ...prevData,
            [name]: value,
            }));

            setErrors((prevErrors) => ({
                ...prevErrors,
                [name]: "",
            }));
        }
    );
};

function handleFormBlur(setErrors, formData = {"password":""}) {
    return (
        (e) => {
            const { name, value } = e.target;
            setErrors((prevErrors) => ({
                ...prevErrors,
                [name]: validate(name, value, formData),
            }));
        }
    );
};

export { validate, handleFormChange, handleFormBlur };

