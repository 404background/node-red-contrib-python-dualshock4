const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

module.exports = function (RED) {
  function DualShock4Node(config) {
    RED.nodes.createNode(this, config);
    const node = this;
    let pythonProcess = null;

    const scriptPath = path.join(__dirname, 'ds4_reader.py');
    const venvPath = path.join(__dirname, 'pyenv/path.json');

    let pythonExec = 'python3';
    if (fs.existsSync(venvPath)) {
      try {
        const paths = JSON.parse(fs.readFileSync(venvPath, 'utf8'));
        pythonExec = paths.NODE_PYENV_PYTHON || pythonExec;
      } catch (err) {
        node.error("Error reading pyenv path.json: " + err);
      }
    }

    function startProcess(selectedInputs, sleepTime) {
      node.status({ fill: 'green', shape: 'dot', text: 'running' });

      pythonProcess = spawn(pythonExec, [scriptPath, sleepTime, JSON.stringify(selectedInputs)]);

      pythonProcess.stdout.on('data', (data) => {
        try {
          const msg = JSON.parse(data.toString().trim());
          node.send({ payload: msg });
        } catch (err) {
          node.error("Invalid JSON from Python: " + data.toString());
        }
      });

      pythonProcess.on('close', () => {
        node.status({ fill: 'red', shape: 'ring', text: 'stopped' });
        pythonProcess = null;
      });
    }

    node.on('input', function (msg) {
      if (msg.kill === true) {
        if (pythonProcess) pythonProcess.kill();
        return;
      }
      if (!pythonProcess) startProcess(config.selectedInputs, config.sleep || 50);
    });

    node.on('close', function () {
      if (pythonProcess) pythonProcess.kill();
    });
  }

  RED.nodes.registerType("dualshock4", DualShock4Node);
};
