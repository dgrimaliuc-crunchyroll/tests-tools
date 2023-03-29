let folder = 'etp-web-automated-test/resources/report' // project
let tagReport = `${folder}/tags.txt`
let duplicateReport = `${folder}/duplicates.txt`
let unexistingReport = `${folder}/unexisting.txt`
let notAutomatedReport = `${folder}/notAutomated.txt`
let archivedReport = `${folder}/archived.txt`
let allTestsJsonPath = `${folder}/all_tests.json`

module.exports = {tagReport, duplicateReport, unexistingReport, notAutomatedReport, archivedReport, allTestsJsonPath}