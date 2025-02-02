const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

module.exports = function(RED) {
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

        function startProcess(selectedButtons, sleepTime, outputMode) {
            node.status({ fill: 'green', shape: 'dot', text: 'running' });

            pythonProcess = spawn(pythonExec, [scriptPath, sleepTime, JSON.stringify(selectedButtons)]);

            pythonProcess.stdout.on('data', (data) => {
                try {
                    const jsonData = JSON.parse(data.toString().trim());
                    const filteredData = { buttons: {}, axes: {} };

                    Object.keys(jsonData.buttons).forEach((key) => {
                        if (config.selectedButtons[key]) {
                            filteredData.buttons[key] = jsonData.buttons[key];
                        }
                    });

                    Object.keys(jsonData.axes).forEach((key) => {
                        if (config.selectedButtons[key]) {
                            filteredData.axes[key] = jsonData.axes[key];
                        }
                    });

                    if (Object.keys(filteredData.buttons).length === 0) {
                        delete filteredData.buttons;
                    }
                    if (Object.keys(filteredData.axes).length === 0) {
                        delete filteredData.axes;
                    }

                    if (outputMode === "single_output") {
                        node.send({ payload: filteredData });
                    } else if (outputMode === "multi_output") {
                        const messages = [];
                        Object.entries(filteredData.buttons).forEach(([key, value]) => {
                            messages.push({ payload: { button: key, value: value } });
                        });
                        Object.entries(filteredData.axes).forEach(([key, value]) => {
                            messages.push({ payload: { axis: key, value: value } });
                        });

                        node.send(messages);
                    }
                } catch (err) {
                    node.error("Invalid JSON from Python: " + data.toString());
                }
            });

            pythonProcess.on('close', () => {
                node.status({ fill: 'red', shape: 'ring', text: 'stopped' });
                pythonProcess = null;
            });
        }

        node.on('input', function(msg) {
            if (msg.kill === true) {
                if (pythonProcess) pythonProcess.kill();
                return;
            }
            if (!pythonProcess) startProcess(config.selectedButtons, config.sleep, config.outputMode);
        });

        node.on('close', function() {
            if (pythonProcess) pythonProcess.kill();
        });
    }

    RED.nodes.registerType("dualshock4", DualShock4Node);
};
