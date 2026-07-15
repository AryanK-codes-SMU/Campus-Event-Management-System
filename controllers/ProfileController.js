const UserInformation = require("../models/UserInfo");

exports.getUser = async (req, res) => {
  const user = await UserInformation.getUserById(req.session.userId);

  if (!user) return res.send("User not found");
  res.render("profile/DisplayProfile", { user });
};

// SHOW EDIT FORM
exports.showEditProfile = async (req, res) => {
  const user = await UserInformation.getUserById(req.session.userId);
  if (!user) return res.send("User not found");
  res.render("profile/EditProfile", { user, error: req.query.error });
};

//UpdateProfile
exports.updateProfile = async (req, res) => {
  const { dob } = req.body;
  const today = new Date();
  const birthDate = new Date(dob);

  //Future date check
  if (birthDate > today) {
    return res.send("Date of birth cannot be in the future.");
  }

  //Age check
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();

  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }

  if (age < 18) {
    return res.redirect("/profile/edit?error=You must be at least 18 years old");
  }

  //Updates if valid
  await UserInformation.updateUser(req.session.userId, req.body);
  const loggedInUser = await UserInformation.findById(req.session.userId)
  req.session.userName = loggedInUser.lastName;
  req.session.userGender = loggedInUser.gender;
  res.redirect("/DisplayProfile");
};
