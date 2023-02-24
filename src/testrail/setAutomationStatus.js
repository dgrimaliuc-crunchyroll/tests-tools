const TestRail = require('@dlenroc/testrail');
const tests = [6591860]
const api = new TestRail({
    host: process.env.TESTRAIL_HOST.replaceAll("\"", ""),
    username: process.env.TESTRAIL_USERNAME,
    password: process.env.TESTRAIL_PASSWORD
});


markRemoved(tests)
markAutomated(tests)


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


