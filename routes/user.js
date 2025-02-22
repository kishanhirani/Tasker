const express = require("express");
const router = express.Router();
const zod = require("zod");
const userModel = require("../model/user.js");
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const Randomstring = require('randomstring');

const validationSchemas = {
  signup: zod.object({
    name: zod.string({ required_error: "Name is required" }),
    email: zod.string().email({ required_error: "Email is required" }),
    password: zod.string({ required_error: "Password is required" }),
    confirmPassword: zod.string({ required_error: "Confirm password is required" }),
  }).refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  }),

  signin: zod.object({
    email: zod.string().email({ required_error: "Email is required" }),
    password: zod.string({ required_error: "Password is required" })
  }),

  otpVerification: zod.object({
    email: zod.string().email({ required_error: "Email is required" }),
    otp: zod.string({ required_error: "OTP is required" }),
  })
};

const emailConfig = {
  transporter: nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER || 'dev.kishanhirani@gmail.com',
      pass: process.env.EMAIL_PASS || 'aioi byag movi chse',
    }
  }),

  templates: {
    otpVerification: (otp) => ({
      subject: "OTP Verification",
      text: `Welcome to Tasker! Here is your OTP: ${otp}`
    }),
    loginAlert: (name) => ({
      subject: "New Login Detected",
      text: `Hi ${name}, we detected a new login to your account. If this wasn't you, please contact support immediately.`
    })
  }
};

const otpStore = {};

const utils = {
  generateOtp: () => Randomstring.generate({ length: 4, charset: "numeric" }),

  hashPassword: (password, salt) => {
    const salt1 = crypto.randomBytes(64).toString("hex");
    const hash = crypto
      .createHmac("sha256", salt ? salt : salt1)
      .update(password)
      .digest("hex");
    return { hash, salt };
  },

  verifyPassword: (password, salt, hashedPassword) => {
    const hash = crypto
      .createHmac("sha256", salt)
      .update(password)
      .digest("hex");
    return hash === hashedPassword;
  },

  async sendEmail(to, template) {
    try {
      await emailConfig.transporter.sendMail({
        from: emailConfig.transporter.options.auth.user,
        to,
        ...template
      });
      return true;
    } catch (error) {
      console.error("Email sending failed:", error);
      return false;
    }
  }
};

const handlers = {
  async signup(req, res) {
    try {
      const validation = validationSchemas.signup.safeParse(req.body);
      if (!validation.success) {
        const [error] = validation.error.errors;
        return res.status(400).json({
          success: false,
          field: error.path[0],
          message: error.message,
        });
      }

      const { name, email, password } = req.body;

      const existingUser = await userModel.findOne({ email });
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: "User already exists, please sign in or use another email address!"
        });
      }

      const { hash, salt } = utils.hashPassword(password);
      const user = await userModel.create({
        name,
        email,
        password: hash,
        salt
      });

      const otp = utils.generateOtp();
      const otpSent = await utils.sendEmail(
        email,
        emailConfig.templates.otpVerification(otp)
      );

      if (!otpSent) {
        return res.status(500).json({
          success: false,
          message: "Failed to send OTP. Please try again later."
        });
      }

      otpStore[email] = otp;

      return res.status(201).json({
        success: true,
        message: "User signed up successfully! OTP sent to your email.",
        data: {
          name: user.name,
          email: user.email
        }
      });
    } catch (error) {
      console.error("Signup error:", error);
      return res.status(500).json({
        success: false,
        message: "Internal server error"
      });
    }
  },

  async signin(req, res) {
    try {
      const validation = validationSchemas.signin.safeParse(req.body);
      if (!validation.success) {
        const [error] = validation.error.errors;
        return res.status(400).json({
          success: false,
          field: error.path[0],
          message: error.message,
        });
      }

      const { email, password } = req.body;

      // Find user
      const user = await userModel.findOne({ email });
      if (!user) {
        return res.status(400).json({
          success: false,
          message: "User doesn't exist, please register!"
        });
      }

      console.log('user', user)

      const { hash, salt } = utils.hashPassword(password, user.salt);
      const isPasswordValid = hash === user.password
      console.log('hash', hash)
      console.log('user.password', user.password)

      if (!isPasswordValid) {
        return res.status(401).json({
          success: false,
          message: "Invalid credentials"
        });
      }

      // Generate and send OTP for 2FA
      const otp = utils.generateOtp();
      const otpSent = await utils.sendEmail(
        email,
        emailConfig.templates.otpVerification(otp)
      );

      if (!otpSent) {
        return res.status(500).json({
          success: false,
          message: "Failed to send OTP. Please try again later."
        });
      }

      // Store OTP
      otpStore[email] = otp;

      // Send login alert
      utils.sendEmail(
        email,
        emailConfig.templates.loginAlert(user.name)
      ).catch(error => {
        console.error("Failed to send login alert:", error);
      });

      return res.status(200).json({
        success: true,
        message: "OTP sent successfully",
        data: {
          name: user.name,
          email: user.email
        }
      });
    } catch (error) {
      console.error("Signin error:", error);
      return res.status(500).json({
        success: false,
        message: "Internal server error"
      });
    }
  },

  async verifyOtp(req, res) {
    try {
      const validation = validationSchemas.otpVerification.safeParse(req.body);
      if (!validation.success) {
        const [error] = validation.error.errors;
        return res.status(400).json({
          success: false,
          field: error.path[0],
          message: error.message,
        });
      }

      const { email, otp } = req.body;

      if (!otpStore[email] || otpStore[email] !== otp) {
        return res.status(400).json({
          success: false,
          message: "Invalid or expired OTP."
        });
      }

      delete otpStore[email];
      const user = await userModel.findOne({ email })
      if (user) {
        return res.status(200).json({
          success: true,
          message: "Signin SuccessFull",
          data: user
        });

      }
      return res.status(200).json({
        success: true,
        message: "OTP verified successfully!"
      });
    } catch (error) {
      console.error("OTP verification error:", error);
      return res.status(500).json({
        success: false,
        message: "Internal server error"
      });
    }
  }
};

// Routes
router.post("/signup", handlers.signup);
router.post("/signin", handlers.signin);
router.post("/verify-otp", handlers.verifyOtp);

module.exports = router;