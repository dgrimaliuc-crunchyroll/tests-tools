(async function () {
    const {getUpdatedTestCases, getAddedTestCases} = require("./helpers/tests-helper.js");
    const {sync: glob} = require('fast-glob');
    const {readFileSync} = require('fs');
    const result = new Map();

    let updatedTests = await getUpdatedTestCases()
    let addedTests = await getAddedTestCases()
    addedTests.push(...updatedTests)
    verifyTags(addedTests)
    verifyDuplicates(addedTests)

    if (result.size > 0) {
        console.log(result)
        throw new Error("Found test mistakes")
    }

    function verifyTags(tests) {
        let tags = readFileSync(glob('resources/**/tags.txt')[0], 'utf-8')
        tests.filter(t => tags.includes(t))
            .forEach(t => {
                result.set(t, {"tags": tags.split("\n").find(l => l.includes(t))})
            })
    }

    function verifyDuplicates(tests) {
        let duplicates = readFileSync(glob('resources/**/duplicates.txt')[0], 'utf-8')
        tests.filter(t => duplicates.includes(t))
            .forEach(t => {
                result.set(t, {"duplicate": duplicates.split("\n").find(l => l.includes(t))})
            })
    }

})();
