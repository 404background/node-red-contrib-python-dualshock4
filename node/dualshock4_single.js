const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

module.exports = function(RED) {
    function DualShock4SingleNode(config) {
        RED.nodes.createNode(this, config);
        const node = this;
        let pythonProcess = null;

        const scriptPath = path.join(__dirname, 'ds4_reader.py');
        const venvPath = path.join(__dirname, '..', 'pyenv/path.json'); 

        let pythonExec = 'python3';
        if (fs.existsSync(venvPath)) {
            try {
                const paths = JSON.parse(fs.readFileSync(venvPath, 'utf8'));
                pythonExec = paths.NODE_PYENV_PYTHON || pythonExec;
            } catch (err) {
                node.error("Error reading pyenv path.json: " + err);
            }
        }

        function startProcess(selectedButtons, sleepTime) {
            node.status({ fill: 'green', shape: 'dot', text: 'running' });

            pythonProcess = spawn(pythonExec, [scriptPath, sleepTime, JSON.stringify(selectedButtons)]);

            pythonProcess.stdout.on('data', (data) => {
                try {
                    let outputData = data.toString().trim();

                    const jsonStartIndex = outputData.indexOf("{");
                    if (jsonStartIndex !== -1) {
                        outputData = outputData.substring(jsonStartIndex);
                    }

                    if (outputData.startsWith("{") && outputData.endsWith("}")) {
                        const jsonData = JSON.parse(outputData);
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

                        node.send({ payload: filteredData });
                    } else {
                        node.error("Received non-JSON data: " + outputData);
                    }
                } catch (err) {
                    node.error("Error processing data: " + err.message);
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
            if (!pythonProcess) {
                startProcess(config.selectedButtons, config.sleep);
            }
        });

        node.on('close', function() {
            if (pythonProcess) pythonProcess.kill();
        });
    }

    RED.nodes.registerType("dualshock4_single", DualShock4SingleNode);
};
