async function updateTestStatus() {
    const TestRail = require('@dlenroc/testrail');
    const {execSync: exec} = require('child_process');
    const {getCasesIds} = require("./helpers/tests-helper.js")
    const api = new TestRail({
        host: process.env.TESTRAIL_HOST,
        username: process.env.TESTRAIL_USERNAME,
        password: process.env.TESTRAIL_PASSWORD
    });

// Get cases ids before and after current PR
    const casesIds = await getCasesIds();
// Requires that merged PR are squashed
    await exec(`git reset --hard  HEAD~1`);
    const oldCasesIds = await getCasesIds();

// Determine cases that were introduced
    const added = [...casesIds]
        .filter((id) => !oldCasesIds.has(id));
// Determine cases that were removed
    const removed = [...oldCasesIds]
        .filter((id) => !casesIds.has(id));

    console.log("Mark Automated: " + added)
    await markAutomated(added)
    console.log("\nMark Removed: " + removed)
    await markRemoved(removed)

    async function markAutomated(tests) {
        tests.forEach(t => {
            api.updateCase(t,
                {
                    "custom_testcase_automated": "1",

                    "custom_automation_status": 4,
                    "custom_chrome_automation_status": 1,
                    "custom_safari_automation_status": 1,
                    "custom_firefox_automation_status": 1,
                    "custom_edge_automation_status": 1,

                    "custom_android_web_automation_status": 14,
                    "custom_ios_web_automation_status": 14,
                    "custom_ipad_web_automation_status": 14,
                    "custom_tablet_web_automation_status": 14,

                    "custom_automationttcid": t.toString()
                })
        })
    }

    async function markRemoved(tests) {

        tests.forEach(t => {
            api.updateCase(t,
                {
                    "custom_testcase_automated": "0",

                    "custom_automation_status": 5,
                    "custom_chrome_automation_status": 9,
                    "custom_safari_automation_status": 9,
                    "custom_firefox_automation_status": 9,
                    "custom_edge_automation_status": 9,

                    "custom_android_web_automation_status": 14,
                    "custom_ios_web_automation_status": 14,
                    "custom_ipad_web_automation_status": 14,
                    "custom_tablet_web_automation_status": 14,

                    "custom_automationttcid": t.toString()
                })
        })
    }
}

module.exports = {updateTestStatus}