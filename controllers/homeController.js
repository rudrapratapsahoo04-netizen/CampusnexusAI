/**
 * Render CampusNexus AI landing page
 */
const home = (req, res) => {
    res.render("home", {
        title: "Home"
    });
};

module.exports = {
    home
};