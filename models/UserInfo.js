const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  firstName: {
    type: String,
    required: true,
    trim: true
  },
  lastName: {
    type: String,
    required: true,
    trim: true
  },
  dob: {
    type: Date,
    required: true
  },
  schoolEmail: {
    type: String,
    required: true,
    trim: true,
    lowercase: true,
    unique: true
  },
  password: {
    type: String,
    required: true
  },
  gender: {
    type: String,
    required: true
  },
  agreeTerms: {
    type: Boolean,
    required: true
  },
  role: {
    type: String,
    enum: ["user","moderator"],
    default: "user"
  },
  securityQuestion: {
  type: String,
  required: true
  },
  securityAnswer: {
    type: String,
    required: true,
    lowercase: true,
    trim: true
  }
});

const User = mongoose.model("User", userSchema, 'UserInformation');

User.registerUser= function(newUser) {
  return User.create(newUser);
}
User.checkEmail= function(schoolEmail) {
  return User.findOne({schoolEmail: schoolEmail.toLowerCase()});
}

User.resetPW= function(email, newPassword) {
  return User.updateOne(
  { schoolEmail: email },{ password: newPassword }
);
}

User.getUserById = function(id) {
  return User.findById(id).select('-password');
};

User.updateUser = function(id, updatedData) {
  return User.updateOne(
    { _id: id },
    {
      firstName: updatedData.firstName,
      lastName: updatedData.lastName,
      dob: updatedData.dob,
      gender: updatedData.gender
    }
  );
};

module.exports = User;

