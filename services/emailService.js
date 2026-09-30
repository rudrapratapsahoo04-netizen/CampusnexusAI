const nodemailer = require("nodemailer");

// =====================================================
// SMTP CONFIGURATION
// =====================================================

const smtpUser = process.env.SMTP_USER;
const smtpPass = process.env.SMTP_PASS;

if (!smtpUser) {
    console.warn("⚠️ SMTP_USER is missing in .env");
}

if (!smtpPass) {
    console.warn("⚠️ SMTP_PASS is missing in .env");
}

// =====================================================
// NODEMAILER TRANSPORTER
// Gmail SMTP: Port 587 + STARTTLS
// =====================================================

const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port: Number(process.env.SMTP_PORT || 465),
    secure: true,

    family: 4,

    auth: {
        user: smtpUser,
        pass: smtpPass
    },

    tls: {
        minVersion: "TLSv1.2"
    },

    connectionTimeout: 30000,
    greetingTimeout: 30000,
    socketTimeout: 60000
});
// =====================================================
// VERIFY SMTP CONNECTION
// =====================================================

const verifyEmailTransport = async () => {
    if (!smtpUser) {
        throw new Error("SMTP_USER is missing in .env");
    }

    if (!smtpPass) {
        throw new Error("SMTP_PASS is missing in .env");
    }

    console.log("==========================================");
    console.log("📧 Testing Gmail SMTP");
    console.log("==========================================");
    console.log("SMTP Host:", process.env.SMTP_HOST || "smtp.gmail.com");
    console.log("SMTP Port:", process.env.SMTP_PORT || 587);
    console.log("SMTP User:", smtpUser);
    console.log("SMTP Password: LOADED");

    try {
        await transporter.verify();

        console.log("✅ Gmail SMTP connection successful.");
        console.log("==========================================");

        return true;
    } catch (error) {
        console.error("❌ Gmail SMTP connection failed.");
        console.error("Code:", error.code);
        console.error("Command:", error.command);
        console.error("Response Code:", error.responseCode);
        console.error("Response:", error.response);
        console.error("Message:", error.message);
        console.error("==========================================");

        throw error;
    }
};

// =====================================================
// ROLE NAME
// =====================================================

const getRoleName = (role) => {
    const roles = {
        student: "Student",
        faculty: "Faculty",
        admin: "Administrator"
    };

    return roles[role] || "User";
};

// =====================================================
// SEND LOGIN OTP
// =====================================================

const sendLoginOTP = async ({ to, name, role, otp }) => {
    if (!to) {
        throw new Error("Recipient email is required.");
    }

    if (!otp) {
        throw new Error("OTP is required.");
    }

    const appName = process.env.APP_NAME || "CampusNexus AI";

    const roleName = getRoleName(role);

    const expiryMinutes = Number(
        process.env.LOGIN_OTP_EXPIRES_MINUTES || 5
    );

    const from =
        process.env.SMTP_FROM ||
        `"${appName}" <${smtpUser}>`;

    const mailOptions = {
        from,
        to,

        subject: `${appName} - Login Verification OTP`,

        text: `
Hello ${name || "User"},

Your ${roleName} login verification OTP is:

${otp}

This OTP will expire in ${expiryMinutes} minutes.

If you did not attempt to login, please ignore this email.

Regards,
${appName}
        `.trim(),

        html: `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Login Verification OTP</title>
</head>

<body style="
    margin:0;
    padding:0;
    background:#f5f7fb;
    font-family:Arial,Helvetica,sans-serif;
">

<div style="
    max-width:600px;
    margin:40px auto;
    padding:35px;
    background:#ffffff;
    border-radius:12px;
    box-shadow:0 4px 20px rgba(0,0,0,0.08);
">

    <h2 style="
        margin-top:0;
        color:#212529;
    ">
        ${appName}
    </h2>

    <p>
        Hello <strong>${name || "User"}</strong>,
    </p>

    <p>
        Your ${roleName} login verification OTP is:
    </p>

    <div style="
        margin:30px 0;
        text-align:center;
    ">

        <span style="
            display:inline-block;
            padding:15px 30px;
            background:#f1f3f5;
            border-radius:10px;
            font-size:32px;
            font-weight:bold;
            letter-spacing:8px;
            color:#212529;
        ">
            ${otp}
        </span>

    </div>

    <p>
        This OTP will expire in
        <strong>${expiryMinutes} minutes</strong>.
    </p>

    <p style="color:#6c757d;">
        If you did not attempt to login,
        please ignore this email.
    </p>

    <hr>

    <p style="
        font-size:13px;
        color:#6c757d;
    ">
        Regards,<br>
        <strong>${appName}</strong>
    </p>

</div>

</body>
</html>
        `
    };

    try {
        const info = await transporter.sendMail(mailOptions);

        console.log("✅ Login OTP email sent successfully.");
        console.log("📧 To:", to);
        console.log("📨 Message ID:", info.messageId);

        return info;
    } catch (error) {
        console.error("❌ Failed to send login OTP email.");
        console.error("Code:", error.code);
        console.error("Command:", error.command);
        console.error("Response Code:", error.responseCode);
        console.error("Response:", error.response);
        console.error("Message:", error.message);

        throw error;
    }
};

// =====================================================
// SEND PASSWORD RESET OTP
// =====================================================

const sendPasswordResetOTP = async ({ to, name, otp }) => {
    if (!to) {
        throw new Error("Recipient email is required.");
    }

    if (!otp) {
        throw new Error("OTP is required.");
    }

    const appName = process.env.APP_NAME || "CampusNexus AI";

    const expiryMinutes = Number(
        process.env.PASSWORD_RESET_OTP_EXPIRES_MINUTES || 5
    );

    const from =
        process.env.SMTP_FROM ||
        `"${appName}" <${smtpUser}>`;

    const mailOptions = {
        from,
        to,

        subject: `${appName} - Password Reset OTP`,

        text: `
Hello ${name || "User"},

Your password reset OTP is:

${otp}

This OTP will expire in ${expiryMinutes} minutes.

If you did not request a password reset, please ignore this email.

Regards,
${appName}
        `.trim(),

        html: `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Password Reset OTP</title>
</head>

<body style="
    margin:0;
    padding:0;
    background:#f5f7fb;
    font-family:Arial,Helvetica,sans-serif;
">

<div style="
    max-width:600px;
    margin:40px auto;
    padding:35px;
    background:#ffffff;
    border-radius:12px;
    box-shadow:0 4px 20px rgba(0,0,0,0.08);
">

    <h2 style="
        margin-top:0;
        color:#212529;
    ">
        ${appName}
    </h2>

    <p>
        Hello <strong>${name || "User"}</strong>,
    </p>

    <p>
        Your password reset OTP is:
    </p>

    <div style="
        margin:30px 0;
        text-align:center;
    ">

        <span style="
            display:inline-block;
            padding:15px 30px;
            background:#f1f3f5;
            border-radius:10px;
            font-size:32px;
            font-weight:bold;
            letter-spacing:8px;
            color:#212529;
        ">
            ${otp}
        </span>

    </div>

    <p>
        This OTP will expire in
        <strong>${expiryMinutes} minutes</strong>.
    </p>

    <p style="color:#6c757d;">
        If you did not request a password reset,
        please ignore this email.
    </p>

    <hr>

    <p style="
        font-size:13px;
        color:#6c757d;
    ">
        Regards,<br>
        <strong>${appName}</strong>
    </p>

</div>

</body>
</html>
        `
    };

    try {
        const info = await transporter.sendMail(mailOptions);

        console.log("✅ Password reset OTP email sent successfully.");
        console.log("📧 To:", to);
        console.log("📨 Message ID:", info.messageId);

        return info;
    } catch (error) {
        console.error("❌ Failed to send password reset OTP email.");
        console.error("Code:", error.code);
        console.error("Command:", error.command);
        console.error("Response Code:", error.responseCode);
        console.error("Response:", error.response);
        console.error("Message:", error.message);

        throw error;
    }
};

// =====================================================
// EXPORTS
// =====================================================

module.exports = {
    transporter,
    sendLoginOTP,
    sendPasswordResetOTP,
    verifyEmailTransport
};