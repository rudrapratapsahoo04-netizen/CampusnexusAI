// ============================================================
// EMAIL SERVICE - RESEND HTTPS API
// ============================================================

const { Resend } = require("resend");


// ============================================================
// RESEND CONFIG
// ============================================================

const resendApiKey =
    process.env.RESEND_API_KEY;

const resendFrom =
    process.env.RESEND_FROM_EMAIL ||
    "CampusNexus <onboarding@resend.dev>";


if (!resendApiKey) {

    console.warn(
        "⚠️ RESEND_API_KEY is missing."
    );

}


const resend =
    new Resend(resendApiKey);


// ============================================================
// VALIDATE EMAIL CONFIG
// ============================================================

const verifyEmailTransport = async () => {

    if (!resendApiKey) {

        throw new Error(
            "RESEND_API_KEY is not configured."
        );

    }

    console.log(
        "✅ Resend email API configured."
    );

    return true;
};


// ============================================================
// COMMON SEND FUNCTION
// ============================================================

const sendEmail = async ({
    to,
    subject,
    html,
    text
}) => {

    if (!resendApiKey) {

        throw new Error(
            "RESEND_API_KEY is not configured."
        );

    }


    if (!to) {

        throw new Error(
            "Recipient email address is required."
        );

    }


    try {

        const { data, error } =
            await resend.emails.send({

                from: resendFrom,

                to: [to],

                subject,

                html,

                text

            });


        if (error) {

            console.error(
                "❌ Resend email API error:",
                error
            );

            throw new Error(
                error.message ||
                "Failed to send email."
            );

        }


        console.log(
            "✅ Email sent successfully:",
            {
                to,
                id: data?.id
            }
        );


        return data;

    } catch (error) {

        console.error(
            "❌ Failed to send email:",
            {
                code: error?.code,
                message: error?.message
            }
        );

        throw error;

    }

};


// ============================================================
// LOGIN OTP
// ============================================================

const sendLoginOTP = async ({
    to,
    name,
    role,
    otp
}) => {

    const safeName =
        name || "User";

    const safeRole =
        role || "user";


    const subject =
        "CampusNexus Login OTP";


    const text = `
Hello ${safeName},

Your CampusNexus login OTP is:

${otp}

This OTP is valid for 5 minutes.

Role: ${safeRole}

If you did not attempt to login, please ignore this email.

Regards,
CampusNexus Team
`.trim();


    const html = `
<!DOCTYPE html>
<html>
<head>

<meta charset="UTF-8">

<meta name="viewport"
      content="width=device-width, initial-scale=1.0">

<title>CampusNexus Login OTP</title>

</head>

<body style="
    margin:0;
    padding:0;
    background:#f4f6f8;
    font-family:Arial,Helvetica,sans-serif;
">

<div style="
    max-width:600px;
    margin:40px auto;
    padding:20px;
">

    <div style="
        background:#ffffff;
        border-radius:16px;
        padding:35px;
        text-align:center;
        box-shadow:0 8px 30px rgba(0,0,0,0.08);
    ">

        <h1 style="
            margin:0 0 10px;
            color:#2563eb;
            font-size:28px;
        ">
            CampusNexus
        </h1>

        <p style="
            color:#555;
            font-size:15px;
            margin-bottom:25px;
        ">
            Login verification
        </p>

        <p style="
            color:#333;
            font-size:16px;
        ">
            Hello <strong>${safeName}</strong>,
        </p>

        <p style="
            color:#555;
            font-size:15px;
        ">
            Use the following OTP to complete your login:
        </p>

        <div style="
            display:inline-block;
            margin:20px 0;
            padding:18px 35px;
            background:#eff6ff;
            border-radius:12px;
            color:#2563eb;
            font-size:32px;
            font-weight:bold;
            letter-spacing:8px;
        ">
            ${otp}
        </div>

        <p style="
            color:#777;
            font-size:14px;
        ">
            This OTP is valid for <strong>5 minutes</strong>.
        </p>

        <p style="
            color:#777;
            font-size:13px;
            margin-top:25px;
        ">
            Account role: ${safeRole}
        </p>

        <hr style="
            border:none;
            border-top:1px solid #eee;
            margin:30px 0;
        ">

        <p style="
            color:#999;
            font-size:12px;
        ">
            If you did not attempt to login to CampusNexus,
            you can safely ignore this email.
        </p>

        <p style="
            color:#999;
            font-size:12px;
        ">
            CampusNexus Team
        </p>

    </div>

</div>

</body>
</html>
`;


    return sendEmail({

        to,

        subject,

        html,

        text

    });

};


// ============================================================
// PASSWORD RESET OTP
// ============================================================

const sendPasswordResetOTP = async ({
    to,
    name,
    otp
}) => {

    const safeName =
        name || "User";


    const subject =
        "CampusNexus Password Reset OTP";


    const text = `
Hello ${safeName},

Your CampusNexus password reset OTP is:

${otp}

This OTP is valid for 5 minutes.

If you did not request a password reset, please ignore this email.

Regards,
CampusNexus Team
`.trim();


    const html = `
<!DOCTYPE html>
<html>
<head>

<meta charset="UTF-8">

<meta name="viewport"
      content="width=device-width, initial-scale=1.0">

<title>CampusNexus Password Reset</title>

</head>

<body style="
    margin:0;
    padding:0;
    background:#f4f6f8;
    font-family:Arial,Helvetica,sans-serif;
">

<div style="
    max-width:600px;
    margin:40px auto;
    padding:20px;
">

    <div style="
        background:#ffffff;
        border-radius:16px;
        padding:35px;
        text-align:center;
        box-shadow:0 8px 30px rgba(0,0,0,0.08);
    ">

        <h1 style="
            margin:0 0 10px;
            color:#2563eb;
            font-size:28px;
        ">
            CampusNexus
        </h1>

        <p style="
            color:#555;
            font-size:15px;
        ">
            Password reset verification
        </p>

        <p style="
            color:#333;
            font-size:16px;
        ">
            Hello <strong>${safeName}</strong>,
        </p>

        <p style="
            color:#555;
            font-size:15px;
        ">
            Use this OTP to reset your password:
        </p>

        <div style="
            display:inline-block;
            margin:20px 0;
            padding:18px 35px;
            background:#eff6ff;
            border-radius:12px;
            color:#2563eb;
            font-size:32px;
            font-weight:bold;
            letter-spacing:8px;
        ">
            ${otp}
        </div>

        <p style="
            color:#777;
            font-size:14px;
        ">
            This OTP is valid for <strong>5 minutes</strong>.
        </p>

        <hr style="
            border:none;
            border-top:1px solid #eee;
            margin:30px 0;
        ">

        <p style="
            color:#999;
            font-size:12px;
        ">
            If you did not request a password reset,
            please ignore this email.
        </p>

        <p style="
            color:#999;
            font-size:12px;
        ">
            CampusNexus Team
        </p>

    </div>

</div>

</body>
</html>
`;


    return sendEmail({

        to,

        subject,

        html,

        text

    });

};


// ============================================================
// EXPORTS
// ============================================================

module.exports = {

    verifyEmailTransport,

    sendLoginOTP,

    sendPasswordResetOTP

};