const {sync: glob} = require("fast-glob");
const {readFileSync} = require("fs");
const {getCurrentPRInfo} = require("./githubHelper");
const {writeIntoFile, readFile} = require("./file-helper");
const {localTestReportPath, allTestsJsonPath} = require("./constants");
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

function getRemoteTests() {
    return JSON.parse(readFile(allTestsJsonPath).replaceAll(/[\n|\t]+/g, ''))
        .map(t => {
            let addTagRes = [t.type]
            if (t.runInProd) {
                addTagRes.push("production")
            }
            if (t.runInCI) {
                addTagRes.push("ci")
            } else
                addTagRes.push("notCi")

            t.tags = sortedDistinct(t.tags
                .split(",")
                .concat(addTagRes)
                .map(f => getExceptOrDefault(f)))
                .join(",")
            return t

        })
}

function getLocalTests(actualTagsFile) {
    const tests = [];

    const commentPattern = /\/\/.+/g;
    const multilineCommentPattern = /\/\*[\s\S]*?\*\//g;
    let actualTags = readFile(actualTagsFile).replaceAll('val ', '')
    for (const file of glob('**/*.kt')) {
        if (!file.startsWith("target/")) {
            const content = readFileSync(file, 'utf-8')
                .replace(commentPattern, '')
                .replace(multilineCommentPattern, '');

            [...content.matchAll(methodRegexPattern)]
                .map(p => p.toString())
                .filter(p => p.includes("@TestCase"))
                .filter(p => p.includes("@Tags"))
                .flatMap(method => {
                    let ids = method.match(/TestCases?\(.+\)/g)[0]
                    let tags = method.match(/Tags\((\n|\s|\w|"|\(|\)|,)+([^(])\)/g)[0]
                        .toString().replaceAll(/[\n\s]/g, '')

                    let chunks = eval(`
                        const foundTests = [];
                        ${actualTags}

                        function combine(ids, tags) {
                            ids.split(",").forEach(i => {
                                foundTests.push({id: i, tag: tags})
                            })
                        }

                        function TestCase(...ids) {
                            return ids.join(",")
                        }

                        function TestCases(...ids) {
                            return ids.join(",")
                        }

                        function Tags(...tags) {
                            return tags.join(",")
                        }

                        function Tag(tag) {
                            return tag
                        }

                        combine(${ids}, ${tags})

                        foundTests
                    `)

                    tests.push(...chunks);
                })
        }
    }

    return formatLocalTest(tests)
}


function saveLocalTests(content) {
    writeIntoFile(content.map(it => `${it.id}: ${it.tag}`).join("\n"), localTestReportPath)
}

function formatLocalTest(tests) {
    return tests.map(t => {
        t.tag = sortedDistinct(t.tag.split(",")
            .map(f => getExceptOrDefault(f)))
            .join(",")
        return t
    })
}


async function getAddedTestCases() {

    let pr = await getCurrentPRInfo()
    // Get cases ids before and after current PR
    const casesIds = await getCasesIds();
    await exec(`git -c advice.detachedHead=false checkout $(git merge-base ${pr.head.sha} origin/${pr.base.ref})`);
    const oldCasesIds = await getCasesIds();

    return [...casesIds]
        .filter((id) => !oldCasesIds.has(id));
}

async function getAffectedTestCases() {
    const idPattern = /\d+/g;
    const changePattern = /(^|\n)[+\\-].+/gm;
    let diff = await exec("git --no-pager diff -U10000 \$(git merge-base HEAD origin/main)",
        {'encoding': 'UTF-8'})
    // get all methods filter to keep only updated , get TestCase anno and retrieve id
    const ids = [...diff.matchAll(methodRegexPattern)]
        .filter(m => m[0].match(changePattern))
        .flatMap((group) => [...group[0]
            .matchAll(testCaseAnnotationPattern)])
        .map(t => t[0].match(idPattern))
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


module.exports = {
    localTestReportPath,
    testCaseAnnotationPattern,
    methodRegexPattern,
    getCasesIds,
    saveLocalTests,
    getAddedTestCases,
    getAffectedTestCases,
    getLocalTests,
    getRemoteTests
}