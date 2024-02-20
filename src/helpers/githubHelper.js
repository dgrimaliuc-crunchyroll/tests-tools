const githubAction = require('@actions/github');
const context = {
  repo: process.env.CIRCLE_PROJECT_REPONAME,
  owner: process.env.CIRCLE_PROJECT_USERNAME,
  issue_number: process.env.CIRCLE_PULL_REQUEST?.match(/\d+/)?.[0],
};

async function getCurrentPRInfo() {
  const github = githubAction.getOctokit(process.env.GITHUB_TOKEN);
  let response = await github.request(
    'GET /repos/{owner}/{repo}/pulls/{pull_number}',
    context
  );
  return response.data;
}

async function notifyFailures(body) {
  const github = githubAction.getOctokit(process.env.GITHUB_TOKEN);
  const commentId = `<!--< Comment from ${process.env.CIRCLE_JOB} job >-->`;
  const comment = await findComment();
  const summary = `${commentId}\n${body}`;

  if (body) {
    if (comment) {
      console.log('Update comment');
      await github.rest.issues.updateComment({
        ...context,
        comment_id: comment.id,
        body: summary,
      });
    } else {
      console.log('Create comment');
      await github.rest.issues.createComment({
        ...context,
        body: summary,
      });
    }
  } else if (comment) {
    console.log('Delete comment');
    await github.rest.issues.deleteComment({
      ...context,
      comment_id: comment.id,
    });
  }
}

async function findComment() {
  const github = githubAction.getOctokit(process.env.GITHUB_TOKEN);
  const comments = await github.rest.issues.listComments(context);
  const commentId = `<!--< Comment from ${process.env.CIRCLE_JOB} job >-->`;
  const comment = comments.data.find(
    (comment) => comment.body.indexOf(commentId) !== -1
  );
  return comment;
}

module.exports = { getCurrentPRInfo, notifyFailures };
