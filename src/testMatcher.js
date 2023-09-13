async function createTxtReports() {
  const { getLocalTests, getRemoteTests } = require('./helpers/tests-helper');
  const { writeIntoFile } = require('./helpers/file-helper.js');
  const { saveLocalTests } = require('./helpers/tests-helper.js');
  const {
    tagReport,
    duplicateReport,
    unexistingReport,
  } = require('./helpers/constants');
  let localTests = getLocalTests();
  let remoteTests = getRemoteTests();
  createReports(localTests, remoteTests);

  function createReports(localTests, remoteTests) {
    console.log('Create txt reports');
    saveLocalTests(localTests);
    findUnexisting(localTests, remoteTests);
    findInvalidTags(localTests, remoteTests);
    findDuplicates(localTests);
  }

  function findDuplicates(localTests) {
    let duplicates = [
      ...new Set(
        localTests
          .filter(
            (it) => localTests.filter((it2) => it.id === it2.id).length > 1
          )
          .map((it) => it.id)
      ),
    ];
    writeIntoFile(duplicates.join('\n'), duplicateReport);
  }

  function findInvalidTags(localTests, remoteTests) {
    let invalidTagsTests = [];
    Array.from(localTests).forEach((t) => {
      let remoteTest = findTestIn(t.id, remoteTests)[0];
      if (remoteTest) {
        let isOk =
          t.tag.split(',').every((tag) =>
            remoteTest.tags
              .split(',')
              .map((t2) => t2.trim())
              .includes(tag.trim())
          ) && tagsLength(t.tag) === tagsLength(remoteTest.tags);
        if (!isOk) {
          invalidTagsTests.push(`${t.id}->${remoteTest.tags} != ${t.tag}`);
        }
      }
    });
    writeIntoFile(invalidTagsTests.join('\n'), tagReport);
  }

  function findUnexisting(localTests, remoteTests) {
    let unexistingTests = [];
    Array.from(localTests).forEach((t) => {
      if (findTestIn(t.id, remoteTests).length === 0) {
        unexistingTests.push(t);
      }
    });
    writeIntoFile(
      unexistingTests.map((it) => it.id).join('\n'),
      unexistingReport
    );
  }

  function findTestIn(test, collection) {
    return collection.filter((it) => it.id.toString() === test);
  }

  function tagsLength(tags) {
    return tags.split(',').length;
  }
}

module.exports = { createTxtReports };
