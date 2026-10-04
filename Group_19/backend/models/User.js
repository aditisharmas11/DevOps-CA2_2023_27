const mongoose = require("mongoose");
const { nanoid } = require("nanoid");

/**
 * Generates a human-readable patient ID like MT-2026-A3F9C2B1
 */
function generatePatientId() {
  const year = new Date().getFullYear();
  const token = nanoid(8).toUpperCase();
  return `MT-${year}-${token}`;
}

/**
 * Generates a human-readable doctor ID like DOC-2026-B8D2E1F4
 */
function generateDoctorId() {
  const year = new Date().getFullYear();
  const token = nanoid(8).toUpperCase();
  return `DOC-${year}-${token}`;
}

/**
 * Generates a human-readable admin ID like ADM-2026-C7E2D1
 */
function generateAdminId() {
  const year = new Date().getFullYear();
  const token = nanoid(6).toUpperCase();
  return `ADM-${year}-${token}`;
}

const userSchema = new mongoose.Schema(
  {
    role: {
      type: String,
      enum: ["patient", "doctor", "admin"],
      default: "patient",
      index: true,
    },
    patientId: {
      type: String,
      unique: true,
      sparse: true,
      index: true,
    },
    doctorId: {
      type: String,
      unique: true,
      sparse: true,
      index: true,
    },
    adminId: {
      type: String,
      unique: true,
      sparse: true,
    },
    specialization: {
      type: String,
      default: "",
      trim: true,
    },
    licenseNumber: {
      type: String,
      default: "",
      trim: true,
    },
    hospitalAffiliation: {
      type: String,
      default: "",
      trim: true,
    },
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    password: {
      type: String,
      required: function () {
        return !this.googleId;
      },
    },
    dateOfBirth: {
      type: Date,
    },
    gender: {
      type: String,
      enum: ["Male", "Female", "Other", "Prefer not to say"],
    },
    // ── Google OAuth Fields ───────────────────────────────────────────────
    googleId: {
      type: String,
      sparse: true,
      unique: true,
    },
    profilePicture: {
      type: String,
      default: "",
    },

    // ── Doctor Credential Document ─────────────────────────────────────────
    doctorIdDocument: {
      filename: { type: String, default: "" },
      url: { type: String, default: "" },
      mimetype: { type: String, default: "" },
      uploadedAt: { type: Date },
    },

    // ── Doctor / Admin Verification Workflow ────────────────────────────────
    // "pending"    -> awaiting admin approval (for doctors)
    // "verified"   -> approved & active (patients auto-verified, doctors after admin review, admins by default)
    // "rejected"   -> doctor application rejected by admin
    verificationStatus: {
      type: String,
      enum: ["pending", "verified", "rejected"],
      default: "verified",
      index: true,
    },
    verifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    verifiedAt: {
      type: Date,
    },
    rejectionReason: {
      type: String,
      default: "",
    },
    rejectedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    rejectedAt: {
      type: Date,
    },
  },
  { timestamps: true }
);

const UserModel = mongoose.model("User", userSchema);
UserModel.generatePatientId = generatePatientId;
UserModel.generateDoctorId = generateDoctorId;
UserModel.generateAdminId = generateAdminId;

module.exports = UserModel;
