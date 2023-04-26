const {readFile} = require("./helpers/file-helper");
const {tagReport, duplicateReport, unexistingReport} = require("./helpers/constants");

async function verifyAutomatedTests() {
    const {getAffectedTestCases} = require("./helpers/tests-helper.js");
    const {notifyFailures} = require("./helpers/githubHelper");
    const result = new Map();

    let tests = await getAffectedTestCases()
    console.log(`updatedTests: ${tests}`)
    verifyTags(tests)
    verifyDuplicates(tests)
    verifyUnexisting(tests)

    if (result.size > 0) {
        console.log(result)
        if (process.env.NOTIFY_FAILURES) {
            let testPath = `${process.env.TESTRAIL_HOST}/index.php?/cases/view`;
            let formattedResult = [...result.entries()]
                .map((k) => k[0].replaceAll(/(.+)/g, `[${k[0]}](${testPath}/${k[0]})`) + "\n" +
                    [...new Set(k[1])].map(it => ` * ${it}`).join("\n"))
                .join("\n\n")
            await notifyFailures(formattedResult)
        }
        throw new Error("Found test mistakes")
    }

    function verifyTags(tests) {
        let tags = readFile(tagReport)
        tests.filter(t => tags.includes(t))
            .forEach(t => {
                addResult(t, tags.split("\n").find(l => l.includes(t)).split("->")[1])
            })
    }

    function verifyDuplicates(tests) {
        let duplicates = readFile(duplicateReport)
        tests.filter(t => duplicates.includes(t))
            .forEach(t => {
                addResult(t, "duplicate")
            })
    }

    function verifyUnexisting(tests) {
        let unexisting = readFile(unexistingReport)
        tests.filter(t => unexisting.includes(t))
            .forEach(t => {
                addResult(t, "unexist")
            })
    }

    function addResult(testId, text) {
        if (result.has(testId)) {
            if (!result.get(testId).includes(text)) {
                result.get(testId).push(text)
            }
        } else {
            result.set(testId, [text])
        }

    }

}

module.exports = {verifyAutomatedTests}