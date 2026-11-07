
const form = document.getElementById("searchForm");
const usernameInput = document.getElementById("username");
const message = document.getElementById("message");
const repoCount = document.getElementById("repoCount");
const followerCount = document.getElementById("followerCount");
const followingCount = document.getElementById("followingCount");
const gistCount = document.getElementById("gistCount");
const loadingSpinner = document.getElementById("loadingSpinner");
let languageChart = null;
let chartObserver = null;
let allRepositories = [];
const repoSearch = document.getElementById("repoSearch");
const repoSort = document.getElementById("repoSort");
const languageFilter = document.getElementById("languageFilter");
const loadMoreBtn = document.getElementById("loadMoreBtn");

let visibleRepoCount = 6;
form.addEventListener("submit", function(event) {
    event.preventDefault();
    const username = usernameInput.value.trim();
    // Reset repository controls for the new search
repoSearch.value = "";
repoSort.value = "updated";
languageFilter.value = "all";
visibleRepoCount = 6;
allRepositories = [];
currentRepositories = [];
loadMoreBtn.hidden = true;
    if (!username) {
        message.textContent = "Please enter a GitHub username.";
        return;
    }
    message.textContent = "Fetching GitHub profile...";
    loadingSpinner.hidden = false;
    document.getElementById("profileSection").hidden = true;
    document.getElementById("analyticsSection").hidden = true;
    // Stop the previous chart observer
    if (chartObserver) {
        chartObserver.disconnect();
        chartObserver = null;
    }
    // Fetch GitHub profile
    fetch(`https://api.github.com/users/${encodeURIComponent(username)}`)

        .then(response => {
    if (response.status === 404) {
        throw new Error("GitHub user not found!");
    }
if (response.status === 403 || response.status === 429) {
    const remainingRequests = response.headers.get("X-RateLimit-Remaining");

    if (response.status === 429 || remainingRequests === "0") {
        throw new Error("GitHub API rate limit exceeded. Please try again later.");
    }

    throw new Error("GitHub denied this request. Please try again later.");
}
    if (!response.ok) {
        throw new Error("Something went wrong. Please try again.");
    }

    return response.json();
})

        .then(data => {
            console.log(data);
            // Calculate GitHub account age
const createdDate = new Date(data.created_at);

const currentDate = new Date();

let accountAge = currentDate.getFullYear() -
    createdDate.getFullYear();

const monthDifference =
    currentDate.getMonth() - createdDate.getMonth();

if (
    monthDifference < 0 ||
    (monthDifference === 0 &&
        currentDate.getDate() < createdDate.getDate())
) {
    accountAge--;
}

document.getElementById("accountAge").textContent =
    accountAge + " years";

            // Update developer statistics
            repoCount.textContent = data.public_repos;
            followerCount.textContent = data.followers;
            followingCount.textContent = data.following;
            gistCount.textContent = data.public_gists;

            // Update developer profile
            document.getElementById("avatar").src = data.avatar_url;

            document.getElementById("avatar").alt =
                `${data.login}'s profile picture`;

            document.getElementById("profileName").textContent =
                data.name || data.login;

            document.getElementById("profileUsername").textContent =
                "@" + data.login;

            document.getElementById("profileBio").textContent =
                data.bio || "No bio provided.";

            document.getElementById("profileLocation").textContent =
                data.location || "Location not provided.";

            const profileLink = document.getElementById("profileLink");
            profileLink.href = data.html_url;

            return fetch(
                `https://api.github.com/users/${encodeURIComponent(username)}/repos?sort=updated&per_page=100`
            );
        })

        // Fetch repositories
       .then(response => {

    if (response.status === 403 || response.status === 429) {
        throw new Error("GitHub API rate limit exceeded while loading repositories. Please try again later.");
    }

    if (!response.ok) {
        throw new Error("Unable to load repositories. Please try again.");
    }

    return response.json();
})

        .then(repositories => {
            allRepositories = repositories;
            // Populate programming language dropdown
const languages = [
    ...new Set(
        repositories
            .map(repo => repo.language)
            .filter(language => language !== null)
    )
];

languageFilter.innerHTML = '<option value="all">All Languages</option>';

languages.sort().forEach(language => {

    const option = document.createElement("option");

    option.value = language;
    option.textContent = language;

    languageFilter.appendChild(option);

});
            // Find the most recently updated repository
if (repositories.length > 0) {

    const latestRepository = repositories.reduce((latest, current) => {

        return new Date(current.updated_at) >
            new Date(latest.updated_at)
            ? current
            : latest;

    });

    document.getElementById("latestRepo").textContent =
        latestRepository.name;

} else {

    document.getElementById("latestRepo").textContent =
        "No repositories";

}
// Find the repository with the highest stars
if (repositories.length > 0) {

    const topStarRepository = repositories.reduce((highest, current) => {

        return current.stargazers_count > highest.stargazers_count
            ? current
            : highest;

    });

    document.getElementById("topStarRepo").textContent =
        topStarRepository.name;

} else {

    document.getElementById("topStarRepo").textContent =
        "No repositories";

}

            let totalStars = 0;
            let totalForks = 0;
            let languageCount = {};

            // Calculate repository statistics
            repositories.forEach(repo => {

                totalStars += repo.stargazers_count;
                totalForks += repo.forks_count;

                if (repo.language) {
                    languageCount[repo.language] =
                        (languageCount[repo.language] || 0) + 1;
                }

            });

            // Prepare chart data
            const languageLabels = Object.keys(languageCount);
            const languageValues = Object.values(languageCount);
            // Calculate total programming languages
const totalLanguages = Object.keys(languageCount).length;

document.getElementById("totalLanguages").textContent =
    totalLanguages;

            const chartCanvas = document.getElementById("languageChart");

            // Destroy previous chart
            if (languageChart) {
                languageChart.destroy();
                languageChart = null;
            }

            if (languageLabels.length > 0) {

                // Show analytics section before creating the chart
                document.getElementById("analyticsSection").hidden = false;

                // Create doughnut chart without immediate animation
                languageChart = new Chart(chartCanvas, {

                    type: "doughnut",

                    data: {
                        labels: languageLabels,

                        datasets: [{
                            data: languageValues,

                            backgroundColor: [
                                "#f1e05a",
                                "#3572A5",
                                "#f34b7d",
                                "#e34c26",
                                "#563d7c",
                                "#58a6ff"
                            ],

                            borderWidth: 2,
                            borderColor: "#161b22"
                        }]
                    },

                    options: {

                        responsive: true,

                        // Wait until the chart enters the screen
                        animation: false,

                       plugins: {
    legend: {
        position: "bottom",
        labels: {
            color: "#c9d1d9"
        }
    },
    tooltip: {
        animation: {
            duration: 0
        },
        transition: {
            duration: 0
        },
        displayColors: true
    }
},
interaction: {
    mode: "nearest",
    intersect: true
}
                    }
                });

                // Observe when the chart becomes visible
                const chartSection =
                    document.querySelector(".chart-container");

                if (chartSection) {

                    chartObserver = new IntersectionObserver((entries) => {

                        if (entries[0].isIntersecting) {

                            // Start slow chart animation
                            languageChart.options.animation = {
                                duration: 1800,
                                easing: "easeOutQuart",
                                animateRotate: true,
                                animateScale: true
                            };

                            languageChart.reset();
                            languageChart.update();

                            // Animate only once per profile search
                            chartObserver.disconnect();
                            chartObserver = null;
                        }

                    }, {
                        threshold: 0.4
                    });

                    chartObserver.observe(chartSection);
                }
            }

            // Update repository analytics
            document.getElementById("totalStars").textContent = totalStars;
            document.getElementById("totalForks").textContent = totalForks;

            let topLanguage = "Not specified";

            for (let language in languageCount) {

                if (
                    topLanguage === "Not specified" ||
                    languageCount[language] > languageCount[topLanguage]
                ) {
                    topLanguage = language;
                }
            }

            document.getElementById("topLanguage").textContent = topLanguage;

            // Display repository cards
            displayRepositories(allRepositories);

            // Display profile and analytics sections
            document.getElementById("profileSection").hidden = false;
            document.getElementById("analyticsSection").hidden = false;
            loadingSpinner.hidden = true;
            message.textContent =
                "GitHub profile and repositories loaded successfully!";

        })

        .catch(error => {
    loadingSpinner.hidden = true;

    if (error instanceof TypeError) {
        message.textContent =
            "Network error. Please check your internet connection and try again.";
    } else {
        message.textContent = error.message;
    }

    console.error(error);
});

});
let currentRepositories = [];

function displayRepositories(repositories) {

    const repoList = document.getElementById("repoList");

    currentRepositories = repositories;

    repoList.innerHTML = "";

    // Display message if no repositories match
    if (repositories.length === 0) {

        repoList.textContent = "No matching repositories found.";

        loadMoreBtn.hidden = true;

        return;
    }

    // Display only the required number of repositories
    const visibleRepositories =
        repositories.slice(0, visibleRepoCount);

    visibleRepositories.forEach(repo => {

        const card = document.createElement("div");
        card.className = "repo-card";

        const title = document.createElement("h3");
        title.textContent = repo.name;

        const description = document.createElement("p");
        description.textContent =
            repo.description || "No description provided.";

        const language = document.createElement("p");
        language.textContent =
            "Language: " + (repo.language || "Not specified");

        const stars = document.createElement("p");
        stars.textContent = "Stars: " + repo.stargazers_count;

        const forks = document.createElement("p");
        forks.textContent = "Forks: " + repo.forks_count;

        const updated = document.createElement("p");
        updated.textContent =
            "Last updated: " +
            new Date(repo.updated_at).toLocaleDateString();

        const link = document.createElement("a");
        link.textContent = "View on GitHub";
        link.href = repo.html_url;
        link.target = "_blank";
        link.rel = "noopener noreferrer";

        card.appendChild(title);
        card.appendChild(description);
        card.appendChild(language);
        card.appendChild(stars);
        card.appendChild(forks);
        card.appendChild(updated);
        card.appendChild(link);

        repoList.appendChild(card);

    });

    // Show or hide Load More button
    loadMoreBtn.hidden =
        visibleRepoCount >= repositories.length;

}
function filterAndSortRepositories() {

    const searchText = repoSearch.value.toLowerCase().trim();

    const sortType = repoSort.value;

    const selectedLanguage = languageFilter.value;

    // Filter repositories by name and language
    let filteredRepositories = allRepositories.filter(repo => {

        const matchesSearch = repo.name.toLowerCase().includes(searchText);

        const matchesLanguage =
            selectedLanguage === "all" ||
            repo.language === selectedLanguage;

        return matchesSearch && matchesLanguage;

    });

    // Sort repositories
    if (sortType === "stars") {

        filteredRepositories.sort((a, b) =>
            b.stargazers_count - a.stargazers_count
        );

    } else if (sortType === "forks") {

        filteredRepositories.sort((a, b) =>
            b.forks_count - a.forks_count
        );

    } else if (sortType === "name") {

        filteredRepositories.sort((a, b) =>
            a.name.localeCompare(b.name)
        );

    } else if (sortType === "updated") {

        filteredRepositories.sort((a, b) =>
            new Date(b.updated_at) - new Date(a.updated_at)
        );

    }
visibleRepoCount = 6;

displayRepositories(filteredRepositories);
}

// Search when the user types
repoSearch.addEventListener("input", filterAndSortRepositories);

// Sort when the dropdown changes
repoSort.addEventListener("change", filterAndSortRepositories);
languageFilter.addEventListener("change", filterAndSortRepositories);
loadMoreBtn.addEventListener("click", function() {

    visibleRepoCount += 6;

    displayRepositories(currentRepositories);

});