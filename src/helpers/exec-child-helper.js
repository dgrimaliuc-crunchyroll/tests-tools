class Listeners {
  outDataListener;
  errorDataListener;
  closeListener;

  constructor(reader, close, err, out) {
    this.outDataListener =
      out ??
      ((data) => {
        //Here is where the output goes
        reader.scriptOutput += data;
      });
    this.errorDataListener =
      err ??
      ((data) => {
        //Here is where the error output goes
        console.log('stderr: ' + data);
        reader.errorOutput += data.toString();
      });
    this.closeListener = close;
  }
}

class Reader {
  scriptOutput = '';
  errorOutput = '';
}

function createNodeChildProcess(childListeners) {
  const terminal = require('child_process').spawn('node');

  terminal.stdout.setEncoding('utf8');
  terminal.stdout.on('data', childListeners.outDataListener);

  terminal.stderr.setEncoding('utf8');
  terminal.stderr.on('data', childListeners.errorDataListener);

  terminal.on('error', (err) => console.log(err.message));

  terminal.on('close', childListeners.closeListener);
  return terminal;
}

function spawnShell(reader, onClosure) {
  return createNodeChildProcess(
    new Listeners(reader, async (code) => {
      //Here you can get the exit code of the script
      console.log(`Closing code:  + ${code}`);
      // console.log(`Full output of script: '${Listeners.scriptOutput}'\nErrors: '${errorOutput}'`);
      if (!reader.scriptOutput) throw 'Output is empty';

      await onClosure.call();
    })
  );
}

function spawn(instruction, spawnOpts = {}, silenceOutput = true) {
  const childProcess = require('child_process');
  return new Promise((resolve, reject) => {
    let errorData = '';

    const [command, ...args] = instruction.split(/\s+/g);

    if (process.env.DEBUG_COMMANDS === 'true') {
      console.log(`Executing \`${instruction}\``);
      console.log('Command', command, 'Args', args);
    }

    const spawnedProcess = childProcess.spawn(
      command,
      args.filter((it) => it !== ''),
      spawnOpts
    );

    let data = '';

    spawnedProcess.on('message', console.log);

    spawnedProcess.stdout.on('data', (chunk) => {
      if (!silenceOutput) {
        console.log(chunk.toString());
      }

      data += chunk.toString();
    });

    spawnedProcess.stderr.on('data', (chunk) => {
      errorData += chunk.toString();
    });

    spawnedProcess.on('close', function (code) {
      if (code > 0) {
        return reject(
          new Error(`${errorData} (Failed Instruction: ${instruction})`)
        );
      }

      resolve(data);
    });

    spawnedProcess.on('error', function (err) {
      reject(err);
    });
  });
}

module.exports = { spawnShell, spawn, Listeners, Reader };
