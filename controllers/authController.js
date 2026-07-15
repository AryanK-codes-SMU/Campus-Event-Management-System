const bcrypt = require('bcrypt');
const UserInformation = require("../models/UserInfo");

// Show register page
exports.showRegisterPage = (req, res) => {
  res.render("auth/register", {
    firstNameError: null,
    lastNameError: null,
    dobError: null,
    emailError: null,
    passwordError: null,
    termsError: null,
    firstName: "",
    lastName: "",
    dob: "",
    schoolEmail: "",
    gender: "",
    agreeTerms: false,
    securityAnswerError: null, 
    securityAnswer: "" ,
    securityQuestion:""
  });
};

// Handle registration
exports.registerUser = async (req, res) => {
  try {
    // Function to capitalize names
    const formatName = (name) => {
      if (!name) return "";
      name = name.trim();
      return name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();
    };

    // Extract values
    const firstName = formatName(req.body.firstName);
    const lastName = formatName(req.body.lastName);
    const dob = req.body.dob;
    const schoolEmail = req.body.registerEmail ? req.body.registerEmail.toLowerCase().trim() : "";
    const password = req.body.registerPassword;
    const agreeTerms = req.body.agreeTerms;
    const gender = req.body.gender;

    // Initialize errors
    let firstNameError = null;
    let lastNameError = null;
    let dobError = null;
    let emailError = null;
    let passwordError = "";
    let termsError = null;
    let registerError = false;

    // Error messages
    if (!firstName) firstNameError = "A first name is required";
    if (!lastName) lastNameError = "A last name is required";
    if (!dob) dobError = "Please enter a valid date";
    if (!schoolEmail) emailError = "An email is required";
    if (!agreeTerms) termsError = "You must agree to the terms and conditions.";

    // Password strength check
    if (!password) {
      passwordError += "A password is required<br>";
    } else {
      let hasUpper = false, hasLower = false, hasNumber = false, hasSpecial = false, hasInvalid = false;
      const allowedSpecials = "!@#$%^&*";

      for (let i = 0; i < password.length; i++) {
        const char = password[i];
        if (char >= "A" && char <= "Z") hasUpper = true;
        else if (char >= "a" && char <= "z") hasLower = true;
        else if (char >= "0" && char <= "9") hasNumber = true;
        else if (allowedSpecials.includes(char)) hasSpecial = true;
        else hasInvalid = true;
      }

      if (password.length < 8) passwordError += "Password must be at least 8 characters<br>";
      if (!hasUpper) passwordError += "Must include at least 1 uppercase letter<br>";
      if (!hasLower) passwordError += "Must include at least 1 lowercase letter<br>";
      if (!hasNumber) passwordError += "Must include at least 1 number<br>";
      if (!hasSpecial) passwordError += "Must include at least 1 special character (!@#$%^&*)<br>";
      if (hasInvalid) passwordError += "Password contains invalid characters<br>";
    }

    // Age check
    const birthDate = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--;
    if (age < 18) dobError = "You must be at least 18 years old.";

    // Check email
    let existingUser = null;
    if (schoolEmail) {
      existingUser = await UserInformation.checkEmail(schoolEmail);
      if (existingUser) emailError = "This email is already registered.";
      if (!schoolEmail.endsWith("smu.edu.sg")) emailError = "Please use a valid school email";
    }

    // Security question
    const securityQuestion = req.body.securityQuestion;
    const securityAnswer = req.body.securityAnswer ? req.body.securityAnswer.toLowerCase().trim() : "";
    let securityAnswerError = null;
    if (!securityAnswer) securityAnswerError = "A security answer is required";

    if (firstNameError || lastNameError || dobError || emailError || passwordError || termsError || securityAnswerError) {
      registerError = true;
    }

    if (!registerError) {
      const hashedPassword = await bcrypt.hash(password, 10);
      // Store security answer in plain text
      const newUser = { 
        firstName, lastName, dob, schoolEmail, password: hashedPassword, gender, agreeTerms: true,
        securityQuestion, securityAnswer
      };
      await UserInformation.registerUser(newUser);

      res.send(`<br><br><br>
        <table border="1" width="400" cellpadding="10" align="center" bgcolor="#fafafa">
        <caption><h2>Success</h2></caption>
        <tr>
            <td>
            Your account has been successfully created!<br>
            Click <a href="/login">here</a> to log in.
            </td>
        </tr>
        </table>
      `);
    } else {
      res.render("auth/register", {
        firstNameError, lastNameError, dobError, emailError,
        passwordError, termsError, firstName, lastName,
        dob, schoolEmail, gender, agreeTerms,
        securityAnswerError, securityQuestion:req.body.securityQuestion,
        securityAnswer: req.body.securityAnswer || ""
      });
    }

  } catch (err) {
    console.error(err);
    res.send("Registration failed.");
  }
};

// Show T&C page
exports.showTnC = (req, res) => {
  res.render("auth/t-and-c");
};

// Show reset password page
exports.showResetPW = (req, res) => {
  res.render("auth/resetPassword", { resetError: null, resetEmail: null, securityQuestion: null });
};

// Handle reset password
exports.resetPW = async (req, res) => {
  try {
    const resetEmail = req.body.resetEmail ? req.body.resetEmail.toLowerCase().trim() : "";
    const securityAnswerInput = req.body.securityAnswer ? req.body.securityAnswer.toLowerCase().trim() : "";
    const resetPassword = req.body.resetPassword;
    const confirmResetPassword = req.body.confirmResetPassword;

    let resetError = "";

    if (!resetEmail) {
      resetError = "Email is required.";
      return res.render("auth/resetPassword", { resetError, resetEmail, securityQuestion: null });
    }

    const existingUser = await UserInformation.checkEmail(resetEmail);
    if (!existingUser) {
      resetError = `No account found. Click <a href="/register">here</a> to register.`;
      return res.render("auth/resetPassword", { resetError, resetEmail, securityQuestion: null });
    }

    //Show security question if answer not submitted
    if (!securityAnswerInput) {
      return res.render("auth/resetPassword", {
        resetError: null,
        resetEmail,
        securityQuestion: existingUser.securityQuestion
      });
    }

    //Verify security answer
    if (securityAnswerInput !== existingUser.securityAnswer) {
      resetError = "Security answer is incorrect.";
      return res.render("auth/resetPassword", {
        resetError,
        resetEmail,
        securityQuestion: existingUser.securityQuestion
      });
    }

    // Validate new passwords
    if (!resetPassword || !confirmResetPassword) {
      resetError = "All fields must be entered.";
      return res.render("auth/resetPassword", { resetError, resetEmail, securityQuestion: existingUser.securityQuestion });
    }

    if (resetPassword !== confirmResetPassword) {
      resetError = "Passwords do not match.";
      return res.render("auth/resetPassword", { resetError, resetEmail, securityQuestion: existingUser.securityQuestion });
    }

    const samePassword = await bcrypt.compare(resetPassword, existingUser.password);
    if (samePassword) {
      resetError = "New password cannot be the same as your old password.";
      return res.render("auth/resetPassword", { resetError, resetEmail, securityQuestion: existingUser.securityQuestion });
    }

    // Password strength validation
    let hasUpper = false, hasLower = false, hasNumber = false, hasSpecial = false, hasInvalid = false;
    const allowedSpecials = "!@#$%^&*";
    for (let i = 0; i < resetPassword.length; i++) {
      const char = resetPassword[i];
      if (char >= "A" && char <= "Z") hasUpper = true;
      else if (char >= "a" && char <= "z") hasLower = true;
      else if (char >= "0" && char <= "9") hasNumber = true;
      else if (allowedSpecials.includes(char)) hasSpecial = true;
      else hasInvalid = true;
    }

    if (resetPassword.length < 8) resetError += "Password must be at least 8 characters<br>";
    if (!hasUpper) resetError += "Must include at least 1 uppercase letter<br>";
    if (!hasLower) resetError += "Must include at least 1 lowercase letter<br>";
    if (!hasNumber) resetError += "Must include at least 1 number<br>";
    if (!hasSpecial) resetError += "Must include at least 1 special character (!@#$%^&*)<br>";
    if (hasInvalid) resetError += "Password contains invalid characters<br>";

    if (resetError) return res.render("auth/resetPassword", { resetError, resetEmail, securityQuestion: existingUser.securityQuestion });

    // Hashing new password and updating it
    const hashedNewPassword = await bcrypt.hash(resetPassword, 10);
    await UserInformation.resetPW(resetEmail, hashedNewPassword);

    return res.send(`<h2>Password reset successfully.</h2> Click <a href="/login">here</a> to login.`);

  } catch (err) {
    console.error("ERROR RESET PW:", err);
    return res.send("Failed to reset password.");
  }
};

// Show login page
exports.showLogin = (req, res) => {
  res.render("auth/login", { loginError: null, loginEmail: "" });
};

// Handle login
exports.loginUser = async (req, res) => {
  try {
    const loginEmail = req.body.loginEmail ? req.body.loginEmail.toLowerCase().trim() : "";
    const loginPassword = req.body.loginPassword;
    let loginError = null;
    //Validation
    if (!loginEmail || !loginPassword) {
      loginError = "Email or password must not be empty.";
      return res.render("auth/login", { loginError, loginEmail });
    }
    //Checks if account exists and compare entered password with database hashed password
    const existingUser = await UserInformation.checkEmail(loginEmail);
    const passwordMatch = existingUser && await bcrypt.compare(loginPassword, existingUser.password);
    if (!passwordMatch) {
      loginError = "Email/Password is incorrect";
      return res.render("auth/login", { loginError, loginEmail });
    }
    //Session
    req.session.userId = existingUser._id;
    req.session.userName = existingUser.lastName;
    req.session.userGender = existingUser.gender;
    req.session.userRole = existingUser.role;
    
    return res.redirect("/events");

  } catch (err) {
    console.error(err);
    return res.send("Login failed.");
  }
};

