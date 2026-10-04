const bcrypt = require("bcryptjs");
const User = require("../models/User");

/**
 * Automatically seeds an initial Admin account if one does not exist.
 * Configured securely via environment variables.
 */
async function seedAdmin() {
  try {
    const adminEmail = (process.env.ADMIN_EMAIL || "admin@meditwin.com").toLowerCase().trim();
    const adminPassword = process.env.ADMIN_PASSWORD || "Admin@MediTwin2026!";
    const adminName = process.env.ADMIN_NAME || "System Administrator";

    const existingAdmin = await User.findOne({
      $or: [{ role: "admin" }, { email: adminEmail }],
    });

    if (existingAdmin) {
      if (existingAdmin.role !== "admin") {
        existingAdmin.role = "admin";
        existingAdmin.verificationStatus = "verified";
        await existingAdmin.save();
      }
      return;
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(adminPassword, salt);

    await User.create({
      role: "admin",
      adminId: User.generateAdminId(),
      name: adminName,
      email: adminEmail,
      password: hashedPassword,
      verificationStatus: "verified",
      verifiedAt: new Date(),
    });

    console.log(`🛡️  Admin account seeded successfully: ${adminEmail}`);
  } catch (err) {
    console.error("❌ Error during admin account seeding:", err.message);
  }
}

module.exports = seedAdmin;
