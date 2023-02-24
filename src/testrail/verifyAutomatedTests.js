try {
    (async function () {
        const {sync: glob} = require('fast-glob');
        const {readFileSync} = require('fs');
        const result = new Map();

        let addedTests = await getAddedTestCases()
        verifyTags(addedTests)


        if (result.size > 0) {
            console.log(result)
            throw new Error("Found test mistakes")
        }

        function verifyTags(tests) {
            let tags = readFileSync(glob('../../resources/**/tags.txt')[0], 'utf-8')
            tests.filter(t => tags.includes(t))
                .forEach(t => {
                    result.set(t, {"tags": tags.split("\n").find(l => l.includes(t))})
                })
        }

        async function getAddedTestCases() {
            const {readFileSync} = require('fs');
            const {execSync: exec} = require('child_process');
            const {sync: glob} = require('fast-glob');

            const github = require('@actions/github').getOctokit(process.env.GITHUB_TOKEN);
            const context = {
                pull_number: process.env.CIRCLE_PULL_REQUEST?.match(/\d+/)?.[0],
                owner: process.env.CIRCLE_PROJECT_USERNAME,
                repo: process.env.CIRCLE_PROJECT_REPONAME,
                branch: process.env.CIRCLE_BRANCH
            };

            if (!context.pull_number) return;
            const { data: pr } = await github.pulls.get(context);

            // Get cases ids before and after current PR
            const casesIds = await getCasesIds();
            await exec(`git -c advice.detachedHead=false checkout $(git merge-base ${pr.head.sha} origin/${pr.base.ref})`);
            const oldCasesIds = await getCasesIds();

            // Determine cases that were introduced
            async function getCasesIds() {
                const idPattern = /\d+/g;
                const commentPattern = /\/\/.+/g;
                const multilineCommentPattern = /\/\*[\s\S]*?\*\//g;
                const testCaseAnnotationPattern = /@?TestCases?\s*\([\s\S]*?\)/g;
                const caseIds = new Set();
                for (const file of glob('**/*.kt')) {
                    const content = readFileSync(file, 'utf-8')
                        .replace(commentPattern, '')
                        .replace(multilineCommentPattern, '');

                    const ids = [...content.matchAll(testCaseAnnotationPattern)]
                        .flatMap((group) => [...group[0].matchAll(idPattern)])
                        .map((groups) => +groups[0]);

                    for (const id of ids) {
                        caseIds.add(id);
                    }
                }
                return caseIds;
            }

            if (casesIds.size)
                return casesIds.filter((id) => !oldCasesIds.has(id)) ? [] : []
            else return []
        }
    })
    ();
} catch (e) {
    throw e
}
/*
const github = require('@actions/github@4.0.0').getOctokit(process.env.GITHUB_TOKEN);
const context = {
    pull_number: process.env.CIRCLE_PULL_REQUEST?.match(/\d+/)?.[0],
    owner: process.env.CIRCLE_PROJECT_USERNAME,
    repo: process.env.CIRCLE_PROJECT_REPONAME,
    branch: process.env.CIRCLE_BRANCH
};
if (!context.pull_number) return;
const {data: pr} = await github.pulls.get(context);
*/
