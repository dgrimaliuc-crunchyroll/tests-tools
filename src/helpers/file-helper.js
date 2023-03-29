const {sync: glob} = require('fast-glob');
const fs = require('fs');

function writeIntoFile(string, filePath) {
    fs.writeFile(filePath, string, function (err) {
        if (err) {
            throw `Can not create or open: ${filePath} \n${err}`;
        }
    });
}

function readFile(filePath) {
    if (!fs.existsSync(filePath)) {
        let foundFiles = glob(`**/${filePath}`)
        if (foundFiles) {
            throw `File doesn't exists: '${filePath}'s`;
        } else filePath = foundFiles[0]
    }
    return fs.readFileSync(filePath, 'utf-8');
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