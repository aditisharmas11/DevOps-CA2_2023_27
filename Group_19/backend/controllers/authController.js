const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const axios = require("axios");
const User = require("../models/User");

/**
 * Generate a signed JWT that expires in 7 days.
 */
function generateToken(id, role) {
  return jwt.sign({ id, role: role || "patient" }, process.env.JWT_SECRET, { expiresIn: "7d" });
}

// ──────────────────────────────────────────────────────────────────────────────
// POST /api/auth/signup
// Handles both standard JSON and multipart/form-data (with doctor ID upload)
// ──────────────────────────────────────────────────────────────────────────────
const signup = async (req, res) => {
  try {
    const {
      name,
      email,
      password,
      dateOfBirth,
      gender,
      role,
      specialization,
      licenseNumber,
      hospitalAffiliation,
    } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: "Name, email and password are required." });
    }

    const cleanEmail = email.trim().toLowerCase();
    const existing = await User.findOne({ email: cleanEmail });
    if (existing) {
      return res.status(409).json({ message: "An account with this email already exists." });
    }

    const userRole = role === "doctor" ? "doctor" : "patient";
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    let normalizedGender = undefined;
    if (gender) {
      const g = String(gender).trim().toLowerCase();
      if (g === "male" || g === "m") normalizedGender = "Male";
      else if (g === "female" || g === "f") normalizedGender = "Female";
      else if (g.includes("prefer")) normalizedGender = "Prefer not to say";
      else normalizedGender = "Other";
    }

    const userData = {
      role: userRole,
      name: name.trim(),
      email: cleanEmail,
      password: hashedPassword,
      dateOfBirth: dateOfBirth || undefined,
      gender: normalizedGender,
      // Patients are active immediately; Doctors require admin credential approval
      verificationStatus: userRole === "doctor" ? "pending" : "verified",
    };

    if (userRole === "doctor") {
      userData.doctorId = User.generateDoctorId();
      userData.specialization = specialization || "General Medicine";
      userData.licenseNumber = licenseNumber || "";
      userData.hospitalAffiliation = hospitalAffiliation || "";

      // If doctor ID document was uploaded via multipart/form-data
      if (req.file) {
        userData.doctorIdDocument = {
          filename: req.file.filename,
          url: `/uploads/doctor-ids/${req.file.filename}`,
          mimetype: req.file.mimetype,
          uploadedAt: new Date(),
        };
      }
    } else {
      userData.patientId = User.generatePatientId();
    }

    const user = await User.create(userData);

    return res.status(201).json({
      message:
        userRole === "doctor"
          ? "Doctor registration submitted successfully! Your account and uploaded credentials are now pending administrator approval."
          : "Account created successfully! Welcome to MediTwin.",
      token: generateToken(user._id, user.role),
      user: {
        id: user._id,
        role: user.role,
        patientId: user.patientId,
        doctorId: user.doctorId,
        specialization: user.specialization,
        licenseNumber: user.licenseNumber,
        hospitalAffiliation: user.hospitalAffiliation,
        doctorIdDocument: user.doctorIdDocument,
        name: user.name,
        email: user.email,
        gender: user.gender,
        dateOfBirth: user.dateOfBirth,
        verificationStatus: user.verificationStatus,
      },
    });
  } catch (err) {
    console.error("signup error:", err);
    if (err.code === 11000) {
      const field = Object.keys(err.keyValue || {})[0] || "field";
      return res.status(409).json({ message: `An account with this ${field} already exists.` });
    }
    if (err.name === "ValidationError") {
      return res.status(400).json({ message: err.message });
    }
    return res.status(500).json({ message: err.message || "Server error during signup." });
  }
};

// ──────────────────────────────────────────────────────────────────────────────
// POST /api/auth/login
// Username/Password authentication (no email verification block)
// ──────────────────────────────────────────────────────────────────────────────
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required." });
    }

    const cleanEmail = email.trim().toLowerCase();
    const user = await User.findOne({ email: cleanEmail });
    if (!user) {
      return res.status(401).json({ message: "Invalid email or password." });
    }

    if (!user.password) {
      return res.status(400).json({
        message: "This account was registered using Google Sign-In. Please sign in with Google.",
      });
    }

    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return res.status(401).json({ message: "Invalid email or password." });
    }

    return res.status(200).json({
      token: generateToken(user._id, user.role),
      user: {
        id: user._id,
        role: user.role || "patient",
        patientId: user.patientId,
        doctorId: user.doctorId,
        adminId: user.adminId,
        specialization: user.specialization,
        licenseNumber: user.licenseNumber,
        hospitalAffiliation: user.hospitalAffiliation,
        doctorIdDocument: user.doctorIdDocument,
        name: user.name,
        email: user.email,
        gender: user.gender,
        dateOfBirth: user.dateOfBirth,
        profilePicture: user.profilePicture,
        verificationStatus: user.verificationStatus,
        rejectionReason: user.rejectionReason,
      },
    });
  } catch (err) {
    console.error("login error:", err);
    return res.status(500).json({ message: "Server error during login." });
  }
};

// ──────────────────────────────────────────────────────────────────────────────
// POST /api/auth/google
// Verify Google ID token and log in or create user
// ──────────────────────────────────────────────────────────────────────────────
const googleAuth = async (req, res) => {
  try {
    const { credential, role } = req.body;

    if (!credential) {
      return res.status(400).json({ message: "Google credential token is required." });
    }

    // Verify token with Google's public tokeninfo endpoint
    let googleUser;
    try {
      const response = await axios.get(
        `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(credential)}`,
        { timeout: 8000 }
      );
      googleUser = response.data;
    } catch (tokenErr) {
      console.error("Google token verification failed:", tokenErr?.response?.data || tokenErr.message);
      return res.status(401).json({ message: "Invalid or expired Google credential." });
    }

    const { sub: googleId, email, name, picture } = googleUser;
    if (!email) {
      return res.status(400).json({ message: "Google profile did not provide a valid email." });
    }

    const cleanEmail = email.toLowerCase().trim();

    // Check if user already exists
    let user = await User.findOne({
      $or: [{ googleId }, { email: cleanEmail }],
    });

    if (user) {
      // If user exists without googleId linked, link it now
      let updated = false;
      if (!user.googleId) {
        user.googleId = googleId;
        updated = true;
      }
      if (picture && !user.profilePicture) {
        user.profilePicture = picture;
        updated = true;
      }
      if (updated) {
        await user.save();
      }
    } else {
      // Create new user via Google
      const userRole = role === "doctor" ? "doctor" : "patient";
      const newUserData = {
        role: userRole,
        googleId,
        name: name || cleanEmail.split("@")[0],
        email: cleanEmail,
        profilePicture: picture || "",
        verificationStatus: userRole === "doctor" ? "pending" : "verified",
      };

      if (userRole === "doctor") {
        newUserData.doctorId = User.generateDoctorId();
        newUserData.specialization = "General Medicine";
      } else {
        newUserData.patientId = User.generatePatientId();
      }

      user = await User.create(newUserData);
    }

    return res.status(200).json({
      message: "Google authentication successful.",
      token: generateToken(user._id, user.role),
      user: {
        id: user._id,
        role: user.role || "patient",
        patientId: user.patientId,
        doctorId: user.doctorId,
        adminId: user.adminId,
        specialization: user.specialization,
        licenseNumber: user.licenseNumber,
        hospitalAffiliation: user.hospitalAffiliation,
        doctorIdDocument: user.doctorIdDocument,
        name: user.name,
        email: user.email,
        gender: user.gender,
        dateOfBirth: user.dateOfBirth,
        profilePicture: user.profilePicture,
        verificationStatus: user.verificationStatus,
        rejectionReason: user.rejectionReason,
      },
    });
  } catch (err) {
    console.error("googleAuth error:", err);
    return res.status(500).json({ message: err.message || "Google authentication failed." });
  }
};

// ──────────────────────────────────────────────────────────────────────────────
// GET /api/auth/me  (protected)
// ──────────────────────────────────────────────────────────────────────────────
const getMe = async (req, res) => {
  const {
    _id,
    role,
    patientId,
    doctorId,
    adminId,
    specialization,
    licenseNumber,
    hospitalAffiliation,
    doctorIdDocument,
    name,
    email,
    gender,
    dateOfBirth,
    profilePicture,
    verificationStatus,
    rejectionReason,
    createdAt,
  } = req.user;

  return res.json({
    id: _id,
    role: role || "patient",
    patientId,
    doctorId,
    adminId,
    specialization,
    licenseNumber,
    hospitalAffiliation,
    doctorIdDocument,
    name,
    email,
    gender,
    dateOfBirth,
    profilePicture,
    verificationStatus,
    rejectionReason,
    createdAt,
  });
};

module.exports = {
  signup,
  login,
  googleAuth,
  getMe,
};
