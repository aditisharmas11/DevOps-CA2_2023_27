const mongoose = require("mongoose");

const doctorFeedbackSchema = new mongoose.Schema(
  {
    patientId: {
      type: String,
      required: [true, "patientId is required"],
      index: true,
    },
    doctorId: {
      type: String,
      required: [true, "doctorId is required"],
      index: true,
    },
    doctorName: {
      type: String,
      required: [true, "doctorName is required"],
    },
    specialization: {
      type: String,
      default: "General Medicine",
    },
    feedback: {
      type: String,
      required: [true, "feedback text is required"],
      trim: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("DoctorFeedback", doctorFeedbackSchema);
