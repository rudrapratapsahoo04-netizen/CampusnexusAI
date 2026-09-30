// ============================================================
// FACULTY LOCAL AI CONTROLLER
// ============================================================

const normalize = (value) => {
    return String(value || "")
        .trim()
        .toLowerCase()
        .replace(/\s+/g, " ");
};


// ============================================================
// INTENT DETECTION
// ============================================================

const detectIntent = (message) => {
    const text = normalize(message);

    // --------------------------------------------------------
    // GREETING
    // --------------------------------------------------------
    if (
        /^(hi|hello|hey|hii|hiii|heyy|good morning|good afternoon|good evening)[!. ]*$/.test(text)
    ) {
        return "greeting";
    }

    // --------------------------------------------------------
    // THANKS
    // --------------------------------------------------------
    if (
        /^(thanks|thank you|thankyou|thx|dhanyavad|shukriya)[!. ]*$/.test(text)
    ) {
        return "thanks";
    }

    // --------------------------------------------------------
    // BYE
    // --------------------------------------------------------
    if (
        /^(bye|goodbye|see you|see ya|good night)[!. ]*$/.test(text)
    ) {
        return "bye";
    }

    // --------------------------------------------------------
    // HOW ARE YOU
    // --------------------------------------------------------
    if (
        /how are you/.test(text) ||
        /kaise ho/.test(text) ||
        /kya haal hai/.test(text)
    ) {
        return "how_are_you";
    }

    // --------------------------------------------------------
    // WHO ARE YOU
    // --------------------------------------------------------
    if (
        /who are you/.test(text) ||
        /what are you/.test(text) ||
        /tum kaun ho/.test(text) ||
        /aap kaun ho/.test(text)
    ) {
        return "identity";
    }

    // --------------------------------------------------------
    // WHAT CAN YOU DO
    // --------------------------------------------------------
    if (
        /what can you do/.test(text) ||
        /what do you do/.test(text) ||
        /kya kar sakte ho/.test(text) ||
        /kya help kar sakte ho/.test(text)
    ) {
        return "capabilities";
    }

    // --------------------------------------------------------
    // HELP
    // --------------------------------------------------------
    if (
        /\bhelp\b/.test(text) ||
        /madad/.test(text)
    ) {
        return "help";
    }

    // --------------------------------------------------------
    // TIMETABLE
    // --------------------------------------------------------
    if (
        /\b(timetable|time table|schedule|class|classes|lecture|lectures)\b/.test(text) ||
        /mera timetable/.test(text) ||
        /my timetable/.test(text) ||
        /meri classes/.test(text) ||
        /my classes/.test(text)
    ) {
        return "timetable";
    }

    // --------------------------------------------------------
    // COURSES / SUBJECTS
    // --------------------------------------------------------
    if (
        /\b(course|courses|subject|subjects|assigned|assignment)\b/.test(text) ||
        /mere course/.test(text) ||
        /mere subjects/.test(text) ||
        /my courses/.test(text)
    ) {
        return "courses";
    }

    // --------------------------------------------------------
    // ATTENDANCE
    // --------------------------------------------------------
    if (
        /\b(attendance|attendence|present|absent)\b/.test(text) ||
        /meri attendance/.test(text) ||
        /my attendance/.test(text)
    ) {
        return "attendance";
    }

    // --------------------------------------------------------
    // LEAVE
    // --------------------------------------------------------
    if (
        /\b(leave|leaves|holiday|vacation)\b/.test(text) ||
        /meri leave/.test(text) ||
        /my leave/.test(text) ||
        /leave status/.test(text)
    ) {
        return "leave";
    }

    // --------------------------------------------------------
    // NOTICE
    // --------------------------------------------------------
    if (
        /\b(notice|notices|announcement|announcements|circular)\b/.test(text)
    ) {
        return "notices";
    }

    // --------------------------------------------------------
    // PROFILE
    // --------------------------------------------------------
    if (
        /\b(profile|details|information|account|faculty details)\b/.test(text) ||
        /meri details/.test(text) ||
        /my details/.test(text) ||
        /my profile/.test(text)
    ) {
        return "profile";
    }

    // --------------------------------------------------------
    // PASSWORD / LOGIN
    // --------------------------------------------------------
    if (
        /\b(password|login|logout|signin|sign in|account)\b/.test(text) ||
        /login nahi/.test(text) ||
        /password bhool/.test(text)
    ) {
        return "account";
    }

    // --------------------------------------------------------
    // DATE / TIME
    // --------------------------------------------------------
    if (
        /\b(today|tomorrow|yesterday|date|time|day)\b/.test(text) ||
        /aaj/.test(text) ||
        /kal/.test(text) ||
        /kitne baje/.test(text)
    ) {
        return "date_time";
    }

    // --------------------------------------------------------
    // SYSTEM / APP
    // --------------------------------------------------------
    if (
        /\b(campusnexus|system|website|application|app|portal|dashboard)\b/.test(text)
    ) {
        return "system";
    }

    // --------------------------------------------------------
    // AI / TECHNOLOGY
    // --------------------------------------------------------
    if (
        /\b(ai|artificial intelligence|machine learning|technology|robot)\b/.test(text)
    ) {
        return "ai";
    }

    // --------------------------------------------------------
    // JOKE / FUN
    // --------------------------------------------------------
    if (
        /\b(joke|jokes|funny|mazak|jokes sunao)\b/.test(text)
    ) {
        return "joke";
    }

    // --------------------------------------------------------
    // MOTIVATION
    // --------------------------------------------------------
    if (
        /\b(motivate|motivation|motivational|inspire|inspiration)\b/.test(text)
    ) {
        return "motivation";
    }

    // --------------------------------------------------------
    // UNKNOWN
    // --------------------------------------------------------
    return "unknown";
};


// ============================================================
// HELP RESPONSE
// ============================================================

const getHelpReply = () => {
    return [
        "I can help you with your CampusNexus faculty information.",
        "",
        "You can ask:",
        "",
        "• Show my timetable",
        "• What courses are assigned to me?",
        "• Show my attendance",
        "• Show my leave status",
        "• Show my notices",
        "• Show my faculty profile",
        "• What can you do?",
        "• Who are you?",
        "",
        "I use local CampusNexus data only."
    ].join("\n");
};


// ============================================================
// MAIN FACULTY AI CHAT
// ============================================================

const facultyAIChat = async (req, res) => {
    try {

        // --------------------------------------------------------
        // AUTH CHECK
        // --------------------------------------------------------

        if (!req.user && !req.session?.user) {
            return res.status(401).json({
                success: false,
                reply: "Please login first."
            });
        }


        // --------------------------------------------------------
        // GET LOGGED-IN FACULTY
        // --------------------------------------------------------

        const facultyUser =
            req.user ||
            req.session.user;

        const facultyId =
            facultyUser._id ||
            facultyUser.id;

        if (!facultyId) {
            return res.status(401).json({
                success: false,
                reply:
                    "Your login session is invalid. Please login again."
            });
        }


        // --------------------------------------------------------
        // MESSAGE
        // --------------------------------------------------------

        const message =
            String(req.body?.message || "")
                .trim();

        if (!message) {
            return res.status(400).json({
                success: false,
                reply: "Please enter a question."
            });
        }


        if (message.length > 500) {
            return res.status(400).json({
                success: false,
                reply:
                    "Please keep your question under 500 characters."
            });
        }


        // --------------------------------------------------------
        // DETECT INTENT
        // --------------------------------------------------------

        const intent = detectIntent(message,facultyId,facultyUser);

        let reply;


        // ========================================================
        // CONVERSATIONAL RESPONSES
        // ========================================================

       switch (intent) {

    case "greeting":
        reply =
            "Hello! 👋 Main CampusNexus Faculty AI Assistant hoon. " +
            "Aap timetable, courses, attendance, leave, notices ya profile ke baare mein pooch sakte hain.";
        break;


    case "identity":
        reply =
            "Main CampusNexus ka Faculty AI Assistant hoon. 🤖 " +
            "Main aapko aapke CampusNexus faculty-related data ko samajhne aur access karne mein help karta hoon.";
        break;


    case "capabilities":
        reply =
            "Main aapki help kar sakta hoon:\n\n" +
            "• Timetable\n" +
            "• Today's classes\n" +
            "• Tomorrow's classes\n" +
            "• Assigned courses\n" +
            "• Attendance\n" +
            "• Leave status\n" +
            "• Notices\n" +
            "• Faculty profile\n" +
            "• CampusNexus information";
        break;


    case "help":
        reply = getHelpReply();
        break;


    case "thanks":
        reply =
            "You're welcome! 😊 Agar CampusNexus ke baare mein aur kuch poochna hai, feel free to ask.";
        break;


    case "bye":
        reply =
            "Goodbye! 👋 Have a great day!";
        break;


    case "how_are_you":
        reply =
            "I'm doing great and ready to help you! 😊 Aap apna question pooch sakte hain.";
        break;


    case "ai":
        reply =
            "AI ka matlab Artificial Intelligence hai. CampusNexus mein main local Faculty Assistant ke roop mein aapke faculty-related tasks mein help karta hoon.";
        break;


    case "joke":
        reply =
            "😄 Faculty joke: Attendance sheet kabhi jhoot nahi bolti, " +
            "lekin attendance ke excuses zaroor interesting hote hain!";
        break;


    case "motivation":
        reply =
            "🌟 Har din thoda progress bhi progress hai. Keep teaching, keep learning and keep improving!";
        break;


    case "account":
        reply =
            "Login, logout ya password issue ke liye CampusNexus account section check karein. " +
            "Main aapka password directly display nahi kar sakta.";
        break;


    case "system":
        reply =
            "CampusNexus ek campus management platform hai. " +
            "Faculty side par aap timetable, courses, attendance, leave, notices aur profile information access kar sakte hain.";
        break;


    case "timetable":
        reply =
            "Aapke logged-in faculty account ka timetable database se fetch kiya jayega.";
        break;


    case "today_timetable":
        reply =
            "Aaj ki aapki faculty classes database ke timetable records se fetch ki jayengi.";
        break;


    case "tomorrow_timetable":
        reply =
            "Kal ki aapki faculty classes database ke timetable records se fetch ki jayengi.";
        break;


    case "courses":
        reply =
            "Aapke assigned courses/subjects faculty records se fetch kiye jayenge.";
        break;


    case "attendance":
        reply =
            "Aapki faculty attendance information attendance records se fetch ki jayegi.";
        break;


    case "leave":
        reply =
            "Aapki leave information aur leave records database se fetch kiye jayenge.";
        break;


    case "leave_status":
        reply =
            "Aapki latest leave request ka status database se check kiya jayega.";
        break;


    case "notices":
        reply =
            "Aapke relevant faculty notices database se fetch kiye jayenge.";
        break;


    case "profile":
        reply =
            `Aap logged-in faculty profile se connected hain.\n\nFaculty ID: ${facultyId}`;
        break;



        case "greeting":
            return "Hello! 👋 Main CampusNexus Faculty AI Assistant hoon. Aapki kya help kar sakta hoon?";

        case "thanks":
            return "You're welcome! 😊";

        case "bye":
            return "Goodbye! 👋 Have a great day!";

        case "identity":
            return "Main CampusNexus ka local Faculty AI Assistant hoon.";

        case "help":
            return "Main timetable, courses, attendance, leave, notices, students aur profile information mein help kar sakta hoon.";

        case "timetable":
            return "Aapka faculty timetable database se fetch kiya jayega.";

        case "today_timetable":
            return "Aaj ki aapki classes database ke timetable se fetch ki jayengi.";

        case "tomorrow_timetable":
            return "Kal ki aapki classes database ke timetable se fetch ki jayengi.";

        case "courses":
            return "Aapke assigned courses database se fetch kiye jayenge.";

        case "students":
            return "Aapke assigned students database se fetch kiye jayenge.";

        case "attendance":
            return "Aapki attendance information database se fetch ki jayegi.";

        case "course_attendance":
            return "Course-wise attendance database se check ki jayegi.";

        case "leave":
            return "Aapki leave information database se fetch ki jayegi.";

        case "leave_status":
            return "Aapki latest leave request ka status database se check kiya jayega.";

        case "leave_history":
            return "Aapki previous leave applications database se fetch ki jayengi.";

        case "pending_requests":
            return "Aapki pending requests database se check ki jayengi.";

        case "notices":
            return "Aapke relevant faculty notices database se fetch kiye jayenge.";

        case "recent_notices":
            return "Latest faculty notices database se fetch kiye jayenge.";

        case "notice_search":
            return "Main relevant notice ko CampusNexus notices mein search karunga.";

        case "profile":
            return `Aapka logged-in faculty account active hai. Faculty ID: ${facultyId}`;

        case "profile_field":
            return `Aapka faculty profile logged-in account se connected hai. Faculty ID: ${facultyId}`;

        case "department":
            return "Aapka department aapke faculty profile se fetch kiya jayega.";

        case "academic_info":
            return "Aapka semester aur academic information faculty records se fetch kiya jayega.";

        case "workload":
            return "Aapka teaching workload timetable aur assigned course records se calculate kiya jayega.";

        case "free_period":
            return "Aapke free periods timetable ke basis par calculate kiye jayenge.";

        case "next_class":
            return "Aapki next class current timetable ke basis par find ki jayegi.";

        case "previous_class":
            return "Aapki previous class timetable ke basis par find ki jayegi.";

        case "classroom":
            return "Aapki class ka room timetable record se fetch kiya jayega.";

        case "course_details":
            return "Course code, subject, semester aur credits course records se fetch kiye jayenge.";

        case "course_location":
            return "Course ka classroom timetable records se find kiya jayega.";

        case "account":
            return "Login, logout ya password problem ke liye CampusNexus account section check karein.";

        case "system":
            return "CampusNexus campus management system hai jahan faculty apna academic aur administrative information access kar sakti hai.";

        case "ai":
            return "Main CampusNexus ka local AI Assistant hoon. 🤖";

        case "ai_about":
            return "Main CampusNexus ka local Faculty AI Assistant hoon. Main application ke available local data aur predefined rules ke saath kaam karta hoon.";

        case "how_are_you":
            return "Main ready hoon aapki help karne ke liye! 😊";

        case "acknowledgement":
            return "Great! 👍 Agar aur kuch chahiye ho to pooch sakte hain.";

        case "joke":
            return "😄 Attendance sheet kabhi jhoot nahi bolti, lekin excuses bahut interesting hote hain!";

        case "motivation":
            return "🌟 Keep teaching, keep learning and keep improving!";

        case "date_time":
            return "Agar aap CampusNexus timetable ke context mein date ya time pooch rahe hain, main timetable records ke basis par information de sakta hoon.";


    default:
        reply =
            "Main aapka question samajhne ki koshish kar raha hoon, lekin is question ke liye mere paas abhi specific CampusNexus data handler nahi hai.\n\n" +
            "Aap timetable, courses, attendance, leave, notices ya profile ke baare mein pooch sakte hain.";
        break;
}

        // --------------------------------------------------------
        // FINAL RESPONSE
        // --------------------------------------------------------

        return res.status(200).json({
            success: true,
            intent,
            reply
        });

    } catch (error) {

        console.error(
            "FACULTY LOCAL AI ERROR:",
            error
        );

        return res.status(500).json({
            success: false,
            reply:
                "I couldn't process your request right now."
        });
    }
};


// ============================================================
// EXPORT
// ============================================================

module.exports = {
    facultyAIChat
};