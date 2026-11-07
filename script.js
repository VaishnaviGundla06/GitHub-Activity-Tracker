const form = document.getElementById("searchForm");
const usernameInput = document.getElementById("username");
const message = document.getElementById("message");

const repoCount = document.getElementById("repoCount");
const followerCount = document.getElementById("followerCount");
const followingCount = document.getElementById("followingCount");
const gistCount = document.getElementById("gistCount");

const loadingSpinner = document.getElementById("loadingSpinner");

const developerStatistics =
    document.querySelector(".developer-statistics");

const profileSection =
    document.getElementById("profileSection");

const analyticsSection =
    document.getElementById("analyticsSection");

const repoSearch = document.getElementById("repoSearch");
const repoSort = document.getElementById("repoSort");
const languageFilter = document.getElementById("languageFilter");
const loadMoreBtn = document.getElementById("loadMoreBtn");

const repoList = document.getElementById("repoList");

// ==============================
// GLOBAL VARIABLES
// ==============================

let languageChart = null;
let chartObserver = null;

let allRepositories = [];
let currentRepositories = [];

let visibleRepoCount = 6;


// ==============================
// GITHUB PROFILE SEARCH
// ==============================

form.addEventListener("submit", async function(event) {

    event.preventDefault();

    const username = usernameInput.value.trim();

    // Reset repository controls
    repoSearch.value = "";
    repoSort.value = "updated";
    languageFilter.innerHTML =
        '<option value="all">All Languages</option>';

    visibleRepoCount = 6;

    allRepositories = [];
    currentRepositories = [];

    loadMoreBtn.hidden = true;

    // Hide previous search results
    developerStatistics.hidden = true;
    profileSection.hidden = true;
    analyticsSection.hidden = true;

    // Clear previous chart observer
    if (chartObserver) {
        chartObserver.disconnect();
        chartObserver = null;
    }

    // Destroy previous chart
    if (languageChart) {
        languageChart.destroy();
        languageChart = null;
    }

    if (!username) {
        message.textContent = "Please enter a GitHub username.";
        return;
    }

    message.textContent = "Fetching GitHub profile...";
    loadingSpinner.hidden = false;

    try {

        // ==============================
        // FETCH GITHUB PROFILE
        // ==============================

        const profileResponse = await fetch(
            `https://api.github.com/users/${encodeURIComponent(username)}`
        );

        if (profileResponse.status === 404) {
            throw new Error("GitHub user not found!");
        }

        if (
            profileResponse.status === 403 ||
            profileResponse.status === 429
        ) {

            const remainingRequests =
                profileResponse.headers.get("X-RateLimit-Remaining");

            if (
                profileResponse.status === 429 ||
                remainingRequests === "0"
            ) {
                throw new Error(
                    "GitHub API rate limit exceeded. Please try again later."
                );
            }

            throw new Error(
                "GitHub denied this request. Please try again later."
            );
        }

        if (!profileResponse.ok) {
            throw new Error(
                "Something went wrong. Please try again."
            );
        }

        const data = await profileResponse.json();

        // ==============================
        // CALCULATE ACCOUNT AGE
        // ==============================

        const createdDate = new Date(data.created_at);
        const currentDate = new Date();

        let accountAge =
            currentDate.getFullYear() - createdDate.getFullYear();

        const monthDifference =
            currentDate.getMonth() - createdDate.getMonth();

        if (
            monthDifference < 0 ||
            (
                monthDifference === 0 &&
                currentDate.getDate() < createdDate.getDate()
            )
        ) {
            accountAge--;
        }

        document.getElementById("accountAge").textContent =
            accountAge + " years";

        // ==============================
        // UPDATE DEVELOPER STATISTICS
        // ==============================

        repoCount.textContent = data.public_repos;
        followerCount.textContent = data.followers;
        followingCount.textContent = data.following;
        gistCount.textContent = data.public_gists;

        // ==============================
        // UPDATE DEVELOPER PROFILE
        // ==============================

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

        const profileLink =
            document.getElementById("profileLink");

        profileLink.href = data.html_url;


        // ==============================
        // FETCH GITHUB REPOSITORIES
        // ==============================

        const repoResponse = await fetch(
            `https://api.github.com/users/${encodeURIComponent(username)}/repos?sort=updated&per_page=100`
        );

        if (
            repoResponse.status === 403 ||
            repoResponse.status === 429
        ) {
            throw new Error(
                "GitHub API rate limit exceeded while loading repositories. Please try again later."
            );
        }

        if (!repoResponse.ok) {
            throw new Error(
                "Unable to load repositories. Please try again."
            );
        }

        const repositories = await repoResponse.json();

        allRepositories = repositories;


        // ==============================
        // POPULATE LANGUAGE FILTER
        // ==============================

        const languages = [
            ...new Set(
                repositories
                    .map(repo => repo.language)
                    .filter(language => language !== null)
            )
        ];

        languages.sort().forEach(language => {

            const option = document.createElement("option");

            option.value = language;
            option.textContent = language;

            languageFilter.appendChild(option);

        });


        // ==============================
        // RECENTLY UPDATED REPOSITORY
        // ==============================

        if (repositories.length > 0) {

            const latestRepository = repositories.reduce(
                (latest, current) => {

                    return new Date(current.updated_at) >
                        new Date(latest.updated_at)
                        ? current
                        : latest;

                }
            );

            document.getElementById("latestRepo").textContent =
                latestRepository.name;

        } else {

            document.getElementById("latestRepo").textContent =
                "No repositories";

        }


        // ==============================
        // TOP STARRED REPOSITORY
        // ==============================

        if (repositories.length > 0) {

            const topStarRepository = repositories.reduce(
                (highest, current) => {

                    return current.stargazers_count >
                        highest.stargazers_count
                        ? current
                        : highest;

                }
            );

            document.getElementById("topStarRepo").textContent =
                topStarRepository.name;

        } else {

            document.getElementById("topStarRepo").textContent =
                "No repositories";

        }


        // ==============================
        // CALCULATE REPOSITORY ANALYTICS
        // ==============================

        let totalStars = 0;
        let totalForks = 0;

        const languageCount = {};

        repositories.forEach(repo => {

            totalStars += repo.stargazers_count;
            totalForks += repo.forks_count;

            if (repo.language) {

                languageCount[repo.language] =
                    (languageCount[repo.language] || 0) + 1;

            }

        });

        const languageLabels = Object.keys(languageCount);
        const languageValues = Object.values(languageCount);

        document.getElementById("totalLanguages").textContent =
            languageLabels.length;

        document.getElementById("totalStars").textContent =
            totalStars;

        document.getElementById("totalForks").textContent =
            totalForks;


        // ==============================
        // MOST-USED PROGRAMMING LANGUAGE
        // ==============================

        let topLanguage = "Not specified";

        if (languageLabels.length > 0) {

            topLanguage = languageLabels.reduce(
                (mostUsed, current) => {

                    return languageCount[current] >
                        languageCount[mostUsed]
                        ? current
                        : mostUsed;

                }
            );

        }

        document.getElementById("topLanguage").textContent =
            topLanguage;


        // ==============================
        // DISPLAY SEARCH RESULTS
        // ==============================

        developerStatistics.hidden = false;
        profileSection.hidden = false;
        analyticsSection.hidden = false;

        displayRepositories(allRepositories);


        // ==============================
        // CREATE LANGUAGE CHART
        // ==============================

        const chartCanvas =
            document.getElementById("languageChart");

        if (languageLabels.length > 0) {

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


            // ==============================
            // CHART ANIMATION ON SCROLL
            // ==============================

            const chartSection =
                document.querySelector(".chart-container");

            if (chartSection) {

                chartObserver = new IntersectionObserver(
                    (entries) => {

                        if (entries[0].isIntersecting) {

                            languageChart.options.animation = {

                                duration: 1800,
                                easing: "easeOutQuart",
                                animateRotate: true,
                                animateScale: true

                            };

                            languageChart.reset();
                            languageChart.update();

                            chartObserver.disconnect();
                            chartObserver = null;

                        }

                    },
                    {
                        threshold: 0.4
                    }
                );

                chartObserver.observe(chartSection);

            }

        }


        // ==============================
        // SEARCH SUCCESS MESSAGE
        // ==============================

        message.textContent =
            "GitHub profile and repositories loaded successfully!";

    }

    catch (error) {

        if (error instanceof TypeError) {

            message.textContent =
                "Network error. Please check your internet connection and try again.";

        } else {

            message.textContent = error.message;

        }

        console.error(error);

    }

    finally {

        loadingSpinner.hidden = true;

    }

});


// ==============================
// DISPLAY REPOSITORIES
// ==============================

function displayRepositories(repositories) {

    repoList.innerHTML = "";

    currentRepositories = repositories;

    if (repositories.length === 0) {

        repoList.textContent =
            "No matching repositories found.";

        loadMoreBtn.hidden = true;

        return;

    }

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

    loadMoreBtn.hidden =
        visibleRepoCount >= repositories.length;

}


// ==============================
// FILTER AND SORT REPOSITORIES
// ==============================

function filterAndSortRepositories() {

    const searchText =
        repoSearch.value.toLowerCase().trim();

    const sortType = repoSort.value;
    const selectedLanguage = languageFilter.value;

    let filteredRepositories = allRepositories.filter(repo => {

        const matchesSearch =
            repo.name.toLowerCase().includes(searchText);

        const matchesLanguage =
            selectedLanguage === "all" ||
            repo.language === selectedLanguage;

        return matchesSearch && matchesLanguage;

    });


    // SORT REPOSITORIES

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


// ==============================
// REPOSITORY EVENT LISTENERS
// ==============================

repoSearch.addEventListener(
    "input",
    filterAndSortRepositories
);

repoSort.addEventListener(
    "change",
    filterAndSortRepositories
);

languageFilter.addEventListener(
    "change",
    filterAndSortRepositories
);


// ==============================
// LOAD MORE REPOSITORIES
// ==============================

loadMoreBtn.addEventListener("click", function() {

    visibleRepoCount += 6;

    displayRepositories(currentRepositories);

});
