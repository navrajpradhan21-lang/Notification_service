import transporter from "../config/mailer.js";

const testConnection = async () => {
  try {
    await transporter.verify();

    console.log("SMTP connection successful!");
  } catch (error) {
    console.error("SMTP connection failed:", error);
  }
};

testConnection();