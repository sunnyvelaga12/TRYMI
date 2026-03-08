// Update all navigation links to use the correct file names
document.addEventListener("DOMContentLoaded", function () {
  // Get all navigation lists
  const navLists = document.querySelectorAll(".nav-links");

  // Check if user is logged in
  const currentUser = localStorage.getItem("currentUser");
  const isLoggedIn = !!currentUser;

  navLists.forEach((navList) => {
    // Update the links with correct file names
    navList.innerHTML = `
            <li><a href="TRYMI.HTML" ${
              window.location.href.includes("TRYMI.HTML")
                ? 'class="active"'
                : ""
            }>Homepage</a></li>
            <li><a href="TRYMI about.HTML" ${
              window.location.href.includes("TRYMI about.HTML")
                ? 'class="active"'
                : ""
            }>About</a></li>
            <li><a href="${isLoggedIn ? "#logout" : "TRYMI_login.HTML"}" ${
      window.location.href.includes("TRYMI_login.HTML") ? 'class="active"' : ""
    }>${isLoggedIn ? "Logout" : "Login"}</a></li>
        `;
  });

  // Add click event listeners to handle navigation
  document.querySelectorAll(".nav-links a").forEach((link) => {
    link.addEventListener("click", function (e) {
      e.preventDefault();
      const href = this.getAttribute("href");
      if (href === "#logout") {
        // Logout: clear currentUser and redirect to login
        localStorage.removeItem("currentUser");
        localStorage.removeItem("isAuthenticated");
        window.open("TRYMI_login.HTML", "_self");
      } else if (href) {
        window.open(href, "_self");
      }
    });
  });
});
