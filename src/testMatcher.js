async function createTxtReports() {
    const {writeIntoFile} = require("./helpers/file-helper.js");
    const {
        prepareRenderData,
        sortedDistinct,
        getExceptOrDefault,
        readLocalTests,
        parseTests,
        saveLocalTests
    } = require("./helpers/tests-helper.js");
    const {spawnShell, Reader} = require('./helpers/exec-child-helper.js')
    let tagsReport = "resources/report/tags.txt"
    let duplicateReport = "resources/report/duplicates.txt"
    let unexistingReport = "resources/report/unexisting.txt"
    let notAutomatedReport = "resources/report/notAutomated.txt"
    let archivedReport = "resources/report/archived.txt"
    let reader = new Reader()

    let allTestsJsonPath = "resources/all_tests.json"
    const {readFile} = require("./helpers/file-helper.js")
    let pathToTagsFile = "test/Tags.kt"
    findAllTestMethods()

    function findAllTestMethods() {
        let terminal = spawnShell(reader, getRender())
        let actualTags = readFile(pathToTagsFile).replaceAll('val ', '')
        prepareRenderData(actualTags, terminal)
        readLocalTests(terminal)
        terminal.stdin.write('console.log(JSON.stringify(Array.from(tests)))\n')
        terminal.stdin.end();
    }


    function createReports(localTests, remoteTests) {
        saveLocalTests(localTests)
        findUnexisting(localTests, remoteTests)
        findInvalidTags(localTests, remoteTests)
        findDuplicates(localTests)
    }


    function findDuplicates(localTests) {
        let duplicates = [...new Set(localTests
            .filter(it => localTests.filter(it2 => it.id === it2.id).length > 1)
            .map(it => it.id))]
        writeIntoFile(duplicates.join("\n"), duplicateReport)
    }

    function findInvalidTags(localTests, remoteTests) {
        let invalidTagsTests = []
        Array.from(localTests).forEach(t => {
            let remoteTest = findTestIn(t.id, remoteTests)[0]
            if (remoteTest) {
                let isOk = t.tag.split(",").every(tag =>
                    remoteTest.tags.split(",").map(t2 => t2.trim()).includes(tag.trim())
                ) && tagsLength(t.tag) === tagsLength(remoteTest.tags)
                if (!isOk) {
                    invalidTagsTests.push(`${t.id}->${remoteTest.tags} != ${t.tag}`)
                }
            }
        })
        writeIntoFile(invalidTagsTests.join("\n"), tagsReport)
    }

    function findUnexisting(localTests, remoteTests) {
        let unexistingTests = []
        Array.from(localTests).forEach(t => {
            if (findTestIn(t.id, remoteTests).length === 0) {
                unexistingTests.push(t)
            }
        })
        writeIntoFile(unexistingTests.join("\n"), unexistingReport)
    }

    function findTestIn(test, collection) {
        return collection.filter(it => it.id.toString() === test)
    }

    function tagsLength(tags) {
        return tags.split(",").length
    }

    function getRender() {
        return () => {
            let localTests = parseTests(reader)

            let remoteTests = JSON.parse(readFile(allTestsJsonPath).replaceAll(/[\n|\t]+/g, ''))
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
            createReports(localTests, remoteTests)
        }
    }
}

module.exports = {createTxtReports}