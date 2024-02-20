async function readRemoteTests() {
  const { writeIntoFile, toJson } = require('./helpers/file-helper.js');
  const { allTestsJsonPath } = require('./helpers/constants');
  const TestRail = require('@dlenroc/testrail');
  const api = new TestRail({
    host: process.env.TESTRAIL_HOST.replace(/"/g, ''),
    username: process.env.TESTRAIL_USERNAME,
    password: process.env.TESTRAIL_PASSWORD,
  });

  const AUTOMATION_STATUS = 'custom_automation_status';
  const FIELD_TAG = 'custom_testcase_tag';
  const projects = await api.getProjects();
  const projectIdS = projects
    .filter((p) =>
      process.env.TESTRAIL_PROJECT_NAME.split(';')
        .map((it) => it.trim())
        .includes(p.name)
    )
    .map((it) => it.id);
  const fields = await api.getCaseFields();
  let cases = [];

  for (const projectId of projectIdS) {
    cases = cases.concat([...(await api.getCases(projectId))]);
  }

  const tags = new Map(
    [
      ...fields
        .find((field) => field.system_name === FIELD_TAG)
        .configs[0].options.items.matchAll(/^\s*(\d+)\s*,\s*(.+)\s*/gm),
    ].map((m) => [+m[1], m[2]])
  );
  const types = new Map(
    [...(await api.getCaseTypes())].map((t) => [+t.id, t.name])
  );
  const statuses = new Map(
    [
      ...fields
        .find((field) => field.system_name === AUTOMATION_STATUS)
        .configs[0].options.items.matchAll(/^\s*(\d+)\s*,\s*(.+)\s*/gm),
    ].map((t) => [+t[1], t[2]])
  ).set(null, 'None');

  let allTests = JSON.stringify(
    cases.map((c) => ({
      id: c.id,
      precondition: c.custom_preconds ?? '',
      steps: c.custom_steps ?? '',
      expected: c.custom_expected ?? '',
      title: c.title,
      isAutomated: statuses.get(c.custom_automation_status) ?? false,
      type: types.get(c.type_id),
      runInProd: c.custom_run_in_production ?? false,
      runInCI: c.custom_ci ?? false,
      refs: (c.refs ? c.refs : '').replace(/,/g, ';'),
      tags: (c[FIELD_TAG] || []).map((id) => tags.get(id)).join(', '),
    }))
  );
  writeIntoFile(allTests, allTestsJsonPath);
}

module.exports = { readRemoteTests };
