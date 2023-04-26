async function getCurrentPRInfo() {
    const context = {
        pull_number: process.env.CIRCLE_PULL_REQUEST?.match(/\d+/)?.[0],
        owner: process.env.CIRCLE_PROJECT_USERNAME,
        repo: process.env.CIRCLE_PROJECT_REPONAME,
        branch: process.env.CIRCLE_BRANCH
    };

    const github = require('@actions/github').getOctokit(process.env.GITHUB_TOKEN);
    let response = await github.request('GET /repos/{owner}/{repo}/pulls/{pull_number}', context);
    return response.data

}

async function notifyFailures(body) {
    const github = require('@actions/github').getOctokit(process.env.GITHUB_TOKEN);
    const context = {
        repo: process.env.CIRCLE_PROJECT_REPONAME,
        owner: process.env.CIRCLE_PROJECT_USERNAME,
        issue_number: process.env.CIRCLE_PULL_REQUEST?.match(/\d+/)?.[0],
    };
    const comments = await github.rest.issues.listComments(context);
    const commentId = `<!--< Comment from ${process.env.CIRCLE_JOB} job >-->`;
    const comment = comments.data.find((comment) => comment.body.indexOf(commentId) !== -1);
    const summary = `${commentId}\n${body}`

    if (body) {
        if (comment) {
            console.log('Update');
            await github.rest.issues.updateComment({
                ...context,
                comment_id: comment.id,
                body: summary
            });
        } else {
            console.log('Create');
            await github.rest.issues.createComment({
                ...context,
                body: summary
            });
        }
    } else if (comment) {
        console.log('Delete');
        await github.rest.issues.deleteComment({
            ...context,
            comment_id: comment.id
        });
    }
}


module.exports = {getCurrentPRInfo, notifyFailures}