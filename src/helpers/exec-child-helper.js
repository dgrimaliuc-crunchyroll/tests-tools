class Listeners {
    outDataListener
    errorDataListener
    closeListener

    constructor(reader, close, err, out) {
        this.outDataListener = out ?? ((data) => {
            //Here is where the output goes
            reader.scriptOutput += data;
        })
        this.errorDataListener = err ?? (data => {
            //Here is where the error output goes
            console.log('stderr: ' + data);
            reader.errorOutput += data.toString()
        })
        this.closeListener = close
    }
}

class Reader {
    scriptOutput = ""
    errorOutput = ""
}

function createNodeChildProcess(childListeners) {
    const terminal = require('child_process').spawn("/usr/local/bin/node")

    terminal.stdout.setEncoding('utf8');
    terminal.stdout.on('data', childListeners.outDataListener);

    terminal.stderr.setEncoding('utf8');
    terminal.stderr.on('data', childListeners.errorDataListener);

    terminal.on('close', childListeners.closeListener);
    return terminal
}

function spawnShell(reader, onClosure) {
    return createNodeChildProcess(
        new Listeners(
            reader,
            code => {
                //Here you can get the exit code of the script
                console.log(`Closing code:  + ${code}`);
                // console.log(`Full output of script: '${Listeners.scriptOutput}'\nErrors: '${errorOutput}'`);
                if (!reader.scriptOutput)
                    throw "Output is empty"

                onClosure.call()
            }
        ))
}

module.exports = {spawnShell, Listeners, Reader}




