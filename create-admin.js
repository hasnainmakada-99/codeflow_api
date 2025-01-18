// require("dotenv").config({ path: "./config.env" });
const mongoose = require("mongoose");
const Admin = require("./src/models/admin");

async function createAdmin() {
  try {
    await mongoose.connect(
      "mongodb+srv://hasnainmakada:hasnain123@cluster0.x0x9i.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0"
    );

    // Generate a random password
    const generatePassword = () => {
      const length = 12;
      const charset =
        "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*";
      let password = "";
      for (let i = 0; i < length; i++) {
        const randomIndex = Math.floor(Math.random() * charset.length);
        password += charset[randomIndex];
      }
      return password;
    };

    const plainPassword = generatePassword();

    const admin = new Admin({
      username: "admin",
      password: plainPassword,
    });

    await admin.save();

    console.log("\n========== ADMIN CREDENTIALS ==========");
    console.log("Username:", admin.username);
    console.log("Password:", plainPassword);
    console.log("=====================================\n");
    console.log("IMPORTANT: Save these credentials now!");
    console.log("This password will not be shown again.\n");
  } catch (error) {
    if (error.code === 11000) {
      console.error("Error: Admin user already exists");
    } else {
      console.error("Error creating admin:", error);
    }
  } finally {
    mongoose.connection.close();
  }
}

createAdmin();
