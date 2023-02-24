try {
    (async function () {
        const TestRail = require('@dlenroc/testrail');
        const api = new TestRail({
            host: process.env.TESTRAIL_HOST.replace(/"/g, ""),
            username: process.env.TESTRAIL_USERNAME,
            password: process.env.TESTRAIL_PASSWORD
        });
        const PROJECT_NAME = "New Crunchyroll Web"
        const AUTOMATION_STATUS = "custom_chrome_automation_status"
        const FIELD_TAG = 'custom_testcase_tag';
        const projects = await api.getProjects();
        const projectId = projects.filter(p => p.name === PROJECT_NAME)[0].id
        const cases = await api.getCases(projectId);
        const fields = await api.getCaseFields();
        let reportPath = "../../resources/all_tests.json";

        const tags = new Map([...fields.find(field => field.system_name === FIELD_TAG)
            .configs[0].options.items.matchAll(/^\s*(\d+)\s*,\s*(.+)\s*/mg)].map(m => [+m[1], m[2]]));
        const types = new Map([...await api.getCaseTypes()].map(t => [+t.id, t.name]))
        const statuses = new Map([...fields.find(field => field.system_name === AUTOMATION_STATUS)
            .configs[0].options.items.matchAll(/^\s*(\d+)\s*,\s*(.+)\s*/mg)].map(t => [+t[1], t[2]]))
            .set(null, "Not_Set")


        let allTests = "[" + cases.map(c => ({
            id: c.id,
            precondition: c.custom_preconds ?? "",
            steps: c.custom_steps ?? "",
            expected: c.custom_expected ?? "",
            title: c.title,
            isAutomated: statuses.get(c.custom_chrome_automation_status),
            type: types.get(c.type_id),
            runInProd: c.custom_run_in_production,
            runInCI: c.custom_ci,
            refs: (c.refs ? c.refs : "").replace(/,/g, ";"),
            tags: (c[FIELD_TAG] || []).map(id => tags.get(id)).join(', ')
        })).map(test => toJson(test)).join(",\n") + "]"
        writeIntoFile(allTests)

        function writeIntoFile(string) {
            const fs = require('fs');
            fs.writeFile(reportPath, string, function (err) {
                if (err) {
                    throw err;
                }
            });
        }

        function toJson(subObject) {
            function format(e) {
                if (typeof e == "string")
                    return `"${e.replace(/([\r|\n]+)/g, "\\n")
                        .replace(/ /g, "")
                        .replace(/"/g, "\\\"")}"`
                else return e
            }

            return "{\n" + Object.entries(subObject).map(e => "\t" + format(e[0]) + ": " + format(e[1])).join(",\n") + "\n}"
        }

    })();
} catch (e) {
    throw e
}