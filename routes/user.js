const express = require("express");
const router = express.Router();
const zod = require("zod");
const userModel = require("../model/user.js");
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const Randomstring = require('randomstring');


const otpStore = {};

// Validation schema for verifying OTP
const verifyOtpBody = zod.object({
  email: zod.string().email({ required_error: "Email is required" }),
  otp: zod.string({ required_error: "OTP is required" }),
});

// Verify OTP endpoint


// Create a transporter for nodemailer
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'dev.kishanhirani@gmail.com',
    pass: 'aioi byag movi chse',
  },
});

// Generate OTP
const generateOtp = () => {
  return Randomstring.generate({ length: 4, charset: "numeric" });
};

// Send OTP via nodemailer
const sendOtp = async (mail, otp) => {
  const mailOptions = {
    from: 'dev.kishanhirani@gmail.com', // Replace with your email
    to: mail,
    subject: "OTP Verification",
    text: `Welcome to Tasker! Here is your OTP: ${otp}`,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log("OTP sent successfully!");
    return true;
  } catch (error) {
    console.error("Error sending OTP:", error);
    return false;
  }
};

const createSignupBody = zod
  .object({
    name: zod.string({ required_error: "Name is required" }),
    email: zod.string().email({ required_error: "Email is required" }),
    password: zod.string({ required_error: "Password is required" }),
    confirmPassword: zod.string({
      required_error: "Confirm password is required",
    }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

// Signup route




router.post("/verify-otp", async (req, res) => {
  const validation = verifyOtpBody.safeParse(req.body);
  const { email, otp } = req.body;

  if (!validation.success) {
    const firstError = validation.error.errors[0];
    return res.status(400).json({
      success: false,
      field: firstError.path[0],
      message: firstError.message,
    });
  }

  // Check if the OTP exists for the email
  if (!otpStore[email] || otpStore[email] !== otp) {
    return res.status(400).json({
      success: false,
      message: "Invalid or expired OTP.",
    });
  }

  // OTP verified successfully; remove the OTP from the store
  delete otpStore[email];

  return res.status(200).json({
    success: true,
    message: "OTP verified successfully!",
  });
});



router.post("/signup", async (req, res) => {
  const validation = createSignupBody.safeParse(req.body);
  const { confirmPassword, name, password, email } = req.body;

  if (!validation.success) {
    const firstError = validation.error.errors[0];
    return res.status(400).json({
      success: false,
      field: firstError.path[0],
      message: firstError.message,
    });
  }

  const salt = crypto.randomBytes(64).toString("hex");

  const encryptedPassword = crypto
    .createHmac("sha256", salt)
    .update(password)
    .digest("hex");

  const emailExists = await userModel.find({ email: email });
  if (emailExists.length > 0) {
    return res.status(400).json({
      success: false,
      message: "User already exists, please sign in or use another email address!",
    });
  }

  // Create the user
  const created = await userModel.create({
    name,
    email,
    password: encryptedPassword,
    salt,
  });

  // Generate and send OTP
  const otp = generateOtp();
  const otpSent = await sendOtp(email, otp);

  if (!otpSent) {
    return res.status(500).json({
      success: false,
      message: "Failed to send OTP. Please try again later.",
    });
  }

  // Save the OTP in the in-memory store
  otpStore[email] = otp;

  return res.status(201).json({
    success: true,
    message: "User signed up successfully! OTP sent to your email.",
    data: {
      name: created.name,
      email: created.email,
    },
  });
});


module.exports = router;
