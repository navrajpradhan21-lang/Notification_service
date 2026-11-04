import transporter from "../config/mailer.js";
import { configDotenv } from "dotenv";
configDotenv();
const sendTestEmail = async () => {
  try {
    const info = await transporter.sendMail({
      from: process.env.MAIL_FROM,
      to: "navrajpradhan21@gmail.com",
      subject: "Notification Service Test",
      text: "Hello! Your notification service is working.",
    });

    console.log("Email sent:", info.messageId);
  } catch (error) {
    console.error(error);
  }
};

sendTestEmail();