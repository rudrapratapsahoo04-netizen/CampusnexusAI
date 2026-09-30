const mongoose = require("mongoose");

const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema(

 {

name: {

type: String,

 required: [true, "Name is required"],

 trim: true,

 minlength: 2,

 maxlength: 100

},

 email: {

 type: String,

 required: [true, "Email is required"],

 unique: true,

 lowercase: true,

 trim: true

 },

 password: {

 type: String,

 required: [true, "Password is required"],

 minlength: 6,

 select: false

 },

 role: {

 type: String,

 enum: [

 "admin",

 "faculty",

  "student",

  "worker"

   ],

 required: true,

 default: "student"

 },

 isActive: {

 type: Boolean,

 default: true

 },

 isDeleted: {

 type: Boolean,

 default: false,

 index: true

 },

 deletedAt: {

 type: Date,

 default: null

 },

 lastLogin: {

 type: Date,

 default: null

 },

 // =====================================

 // LOGIN OTP

 // =====================================

 loginOTP: {

 type: String,

 default: null,

 select: false

 },

 loginOTPExpires: {

 type: Date,

 default: null,

 select: false

 },

 loginOTPAttempts: {

 type: Number,

 default: 0,

 select: false

 },

 loginOTPLastSentAt: {

 type: Date,

 default: null,

 select: false

 },

// =====================================

 // PASSWORD RESET OTP

 // =====================================

 passwordResetOTP: {

 type: String,

 default: null,

 select: false

 },

 passwordResetOTPExpires: {

 type: Date,

 default: null,

 select: false

 },

 passwordResetOTPAttempts: {

 type: Number,

 default: 0,

 select: false

 },

 passwordResetLastSentAt: {

 type: Date,

 default: null,

 select: false

 }

 },

 {

 timestamps: true

 }

);

// =====================================

// PASSWORD HASH

// =====================================

userSchema.pre("save", async function () {

 if (!this.isModified("password")) {

 return;

 }

 const salt = await bcrypt.genSalt(12);

 this.password = await bcrypt.hash(

 this.password,

 salt

 );

});

// =====================================

// PASSWORD COMPARE

// =====================================

userSchema.methods.comparePassword = async function (

 candidatePassword

) {

 return bcrypt.compare(

 candidatePassword,

 this.password

 );

};

module.exports =

 mongoose.model("User", userSchema);