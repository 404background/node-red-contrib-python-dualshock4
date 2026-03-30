const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

function resolvePythonExec(node) {
    const venvPath = path.join(__dirname, '..', 'pyenv', 'path.json');
    let pythonExec = process.platform === 'win32' ? 'python' : 'python3';

    if (fs.existsSync(venvPath)) {
        try {
            const paths = JSON.parse(fs.readFileSync(venvPath, 'utf8'));
            pythonExec = paths.NODE_PYENV_PYTHON || pythonExec;
        } catch (err) {
            node.error('Error reading pyenv path.json: ' + err);
        }
    }

    return pythonExec;
}

function startDs4Process({ node, pythonExec, scriptPath, args, onJson, onExit }) {
    node.status({ fill: 'green', shape: 'dot', text: 'running' });

    const child = spawn(pythonExec, [scriptPath, ...args]);
    let stdoutBuffer = '';
    let finished = false;

    const safeExit = () => {
        if (!finished) {
            finished = true;
            if (onExit) {
                onExit();
            }
        }
    };

    child.stdout.on('data', (data) => {
        stdoutBuffer += data.toString();

        const lines = stdoutBuffer.split(/\r?\n/);
        stdoutBuffer = lines.pop();

        lines.forEach((line) => {
            const trimmedLine = line.trim();
            if (!trimmedLine) {
                return;
            }

            let jsonData;
            try {
                jsonData = JSON.parse(trimmedLine);
            } catch (err) {
                node.debug('Ignoring non-JSON stdout: ' + trimmedLine);
                return;
            }

            if (onJson) {
                onJson(jsonData);
            }
        });
    });

    child.stderr.on('data', (data) => {
        node.error('Python stderr: ' + data.toString().trim());
    });

    child.on('error', (err) => {
        node.status({ fill: 'red', shape: 'ring', text: 'error' });
        node.error('Failed to start Python process: ' + err.message);
        safeExit();
    });

    child.on('close', () => {
        node.status({ fill: 'red', shape: 'ring', text: 'stopped' });
        safeExit();
    });

    return child;
}

function stopDs4Process(node, child, done) {
    if (child) {
        if (process.platform === 'win32') {
            const { exec } = require('child_process');
            exec(`taskkill /pid ${child.pid} /T /F`, (err) => {
                if (done) done();
            });
        } else {
            child.kill();
            if (done) done();
        }
        node.status({ fill: 'red', shape: 'ring', text: 'stopped' });
    } else {
        if (done) done();
    }
}

module.exports = {
    resolvePythonExec,
    startDs4Process,
    stopDs4Process
};
