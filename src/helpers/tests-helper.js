const {sync: glob} = require("fast-glob");
const {readFileSync} = require("fs");
const {writeIntoFile, readFile} = require("./file-helper");
const {localTestReportPath} = require("./constants");
const {execSync: exec} = require('child_process');
const testCaseAnnotationPattern = /@?TestCases?\s*\([\s\S]*?\)/g;
let methodRegexPattern = /[+\- ](\s*)?@[TP]\w+\s+(`?)(.+?)\2\s*\([\S\s]+?\n[+\- ]\1}/g;


function sortedDistinct(arr) {
    return [...new Set(arr)].sort()
}

function getExceptOrDefault(tag) {
    return new Map([
        ["Anonymous user", "anonymousUser"],
        ["Data Validation", "analyticsEvents"],
        ["Data analytics", "analyticsEvents"],
        ["vilosAndroidWebRegression", "regression"],
        ["Regression", "regression"],
        ["vilosRegression", "regression"],
        ["vilosAndroidWebSmoke", "smoke"],
        ["Smoke & Sanity", "smoke"],
        ["vilosSmoke", "smoke"],
        ["Share", "share"]])
        .get(tag.trim()) ?? tag.trim()
}


function saveLocalTests(content) {
    writeIntoFile(content.map(it => `${it.id}: ${it.tag}`).join("\n"), localTestReportPath)
}

function parseTests(reader) {
    return JSON.parse(reader.scriptOutput)
        .map(t => {
            t.tag = sortedDistinct(t.tag.split(",")
                .map(f => getExceptOrDefault(f)))
                .join(",")
            return t
        })
}

function readLocalTests(terminal) {
    const commentPattern = /\/\/.+/g;
    const multilineCommentPattern = /\/\*[\s\S]*?\*\//g;
    for (const file of glob('**/*.kt')) {
        if (!file.startsWith("target/")) {
            const content = readFileSync(file, 'utf-8')
                .replace(commentPattern, '')
                .replace(multilineCommentPattern, '');
            renderTests(content, terminal);
        }
    }
}


async function getAddedTestCases() {
    const github = require('@actions/github').getOctokit(process.env.GITHUB_TOKEN);
    const context = {
        pull_number: process.env.CIRCLE_PULL_REQUEST?.match(/\d+/)?.[0],
        owner: process.env.CIRCLE_PROJECT_USERNAME,
        repo: process.env.CIRCLE_PROJECT_REPONAME,
        branch: process.env.CIRCLE_BRANCH
    };

    if (!context.pull_number) return;
    const {data: pr} = await github.pulls.get(context);

    // Get cases ids before and after current PR
    const casesIds = await getCasesIds();
    await exec(`git -c advice.detachedHead=false checkout $(git merge-base ${pr.head.sha} origin/${pr.base.ref})`);
    const oldCasesIds = await getCasesIds();

    return [...casesIds]
        .filter((id) => !oldCasesIds.has(id));
}

async function getUpdatedTestCases() {
    const idPattern = /\d+/g;
    const changePattern = /(^|\n)[+\\-].+/gm;
    let diff = await exec("git --no-pager diff -U10000 \$(git merge-base HEAD origin/main)",
        {'encoding': 'UTF-8'})
    // get all methods filter to keep only updated , get TestCase anno and retrieve id
    const ids = [...diff.matchAll(methodRegexPattern)]
        .filter(m => m[0].match(changePattern))
        .flatMap((group) => group[0]
            .match(testCaseAnnotationPattern)[0]
            .match(idPattern))
        .map((groups) => +groups);

    return readFile(localTestReportPath)
        .split('\n')
        .filter(it => ids.includes(it.match(idPattern).map(group => +group)[0]))
        .map(it => it.split(":"))
        .map(it => it[0])
}


async function getCasesIds() {
    const idPattern = /\d+/g;
    const commentPattern = /\/\/.+/g;
    const multilineCommentPattern = /\/\*[\s\S]*?\*\//g;
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

function prepareRenderData(actualTags, terminal) {
    terminal.stdin.write(actualTags + "\n")
    terminal.stdin.write(
        "let List = require(\"collections/list\")\n" +
        "let tests = new List()\n" +
        "    function combine(ids, tags) {\n" +
        "        ids.split(\",\").forEach(i => {\n" +
        "            tests.add({id:i,tag:tags})\n" +
        "        })\n" +
        "    }\n" +
        "    function TestCase(...ids) {\n" +
        "        return ids.join(\",\")\n" +
        "    }\n" +
        "    function TestCases(...ids) {\n" +
        "        return ids.join(\",\")\n" +
        "    }\n" +
        "    function Tags(...tags) {\n" +
        "        return tags.join(\",\")\n" +
        "    }\n" +
        "    function Tag(tag) {\n" +
        "        return tag\n" +
        "    }\n\n")
}

function renderTests(content, terminal) {
    [...content.matchAll(methodRegexPattern)]
        .map(p => p.toString())
        .filter(p => p.includes("@TestCase"))
        .filter(p => p.includes("@Tags"))
        .flatMap(method => {
            let ids = method.match(/TestCases?\(.+\)/g)[0]
            let tags = method.match(/Tags\((\n|\s|\w|"|\(|\)|,)+([^(])\)/g)[0]
                .toString().replaceAll(/[\n\s]/g, '')
            terminal.stdin.write('combine(' + ids + ', ' + tags + ')\n')
        })
}

module.exports = {
    localTestReportPath,
    testCaseAnnotationPattern,
    methodRegexPattern,
    getCasesIds,
    prepareRenderData,
    sortedDistinct,
    getExceptOrDefault,
    readLocalTests,
    parseTests,
    saveLocalTests,
    getAddedTestCases,
    getUpdatedTestCases
}