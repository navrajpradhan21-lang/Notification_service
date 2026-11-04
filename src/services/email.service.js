import transporter from "../config/mailer.js";

export const sendNotificationEmail = async({
    to,
    subject,
    message,
}) =>{
    const info = await transporter.sendMail({
        from: `"Notification Service" <${process.env.SMTP_USER}>`,
        to,
        subject,
        text: message,
        html: `<h2>${subject}</h2><p>${message}</p>`,

    });
    console.log("Email sent:",info.messageId);
    // Ethereal provides a preview URL for test emails
    console.log("Preview:", nodemailer.getTestMessageUrl(info));
    return info;
};
