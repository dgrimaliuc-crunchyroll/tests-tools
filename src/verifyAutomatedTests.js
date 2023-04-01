const {readFile} = require("./helpers/file-helper");
const {tagReport, duplicateReport, unexistingReport} = require("./helpers/constants");

async function verifyAutomatedTests() {
    const {getUpdatedTestCases, getAddedTestCases} = require("./helpers/tests-helper.js");
    const result = new Map();

    let updatedTests = await getUpdatedTestCases()
    console.log(`updatedTests: ${updatedTests}`)
    let addedTests = await getAddedTestCases()
    console.log(`addedTests: ${addedTests}`)
    addedTests.push(...updatedTests)
    verifyTags(addedTests)
    verifyDuplicates(addedTests)
    verifyUnexisting(addedTests)

    if (result.size > 0) {
        console.log(result)
        throw new Error("Found test mistakes")
    }

    function verifyTags(tests) {
        let tags = readFile(tagReport)
        tests.filter(t => tags.includes(t))
            .forEach(t => {
                result.set(t, {"tags": tags.split("\n").find(l => l.includes(t))})
            })
    }

    function verifyDuplicates(tests) {
        let duplicates = readFile(duplicateReport)
        tests.filter(t => duplicates.includes(t))
            .forEach(t => {
                result.set(t, {"duplicate": true})
            })
    }

    function verifyUnexisting(tests) {
        let unexisting = readFile(unexistingReport)
        tests.filter(t => unexisting.includes(t))
            .forEach(t => {
                result.set(t, {"unexist": true})
            })
    }

}

module.exports = {verifyAutomatedTests}