function writeIntoFile(string, reportPath) {
    const fs = require('fs');
    if (!fs.existsSync("resources")) {
        reportPath = "../../" + reportPath // may not work
    }
    fs.writeFile(reportPath, string, function (err) {
        if (err) {
            throw `Can not create or open: ${reportPath} \n${err}`;
        }
    });
}

function readFile(reportPath) {
    const fs = require('fs');
    if (!fs.existsSync("resources")) {
        reportPath = "../../" + reportPath
    }
    return fs.readFileSync(reportPath, 'utf-8');
}

function toJson(subObject) {
    function format(e) {
        if (typeof e == "string")
            return `"${e.replace(/([\r|\n]+)/g, "\\n")
                .replace(/ /g, "")
                .replace(/"/g, "\\\"")
                .replaceAll(/\\[\s']/g, '')}"`
        else return e
    }

    return "{\n" + Object.entries(subObject).map(e => "\t" + format(e[0]) + ": " + format(e[1])).join(",\n") + "\n}"
}

module.exports = {toJson, writeIntoFile, readFile};