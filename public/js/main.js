document.addEventListener("DOMContentLoaded", () => {

    /*
    |--------------------------------------------------------------------------
    | Auto-hide Bootstrap alerts
    |--------------------------------------------------------------------------
    */

    const alerts = document.querySelectorAll(".alert");

    alerts.forEach((alert) => {

        setTimeout(() => {

            const bootstrapAlert =
                bootstrap.Alert.getOrCreateInstance(alert);

            bootstrapAlert.close();

        }, 5000);

    });


    /*
    |--------------------------------------------------------------------------
    | Current year fallback
    |--------------------------------------------------------------------------
    */

    console.log("CampusNexus AI frontend initialized.");

});