async function getCurrentPRInfo() {
    const context = {
        pull_number: process.env.CIRCLE_PULL_REQUEST?.match(/\d+/)?.[0],
        owner: process.env.CIRCLE_PROJECT_USERNAME,
        repo: process.env.CIRCLE_PROJECT_REPONAME,
        branch: process.env.CIRCLE_BRANCH
    };

    const github = require('@actions/github').getOctokit(process.env.GITHUB_TOKEN);
    let response = await github.request('GET /repos/{owner}/{repo}/pulls/{pull_number}', context);
    if (response.status !== 200) {
        throw "Failed to get PR info: \n" + JSON.stringify(response.data)
    }
    return response.data

}

module.exports = {getCurrentPRInfo}