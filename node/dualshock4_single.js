const path = require('path');
const { resolvePythonExec, startDs4Process, stopDs4Process } = require('./ds4_common');

module.exports = function(RED) {
    function DualShock4SingleNode(config) {
        RED.nodes.createNode(this, config);
        const node = this;
        let pythonProcess = null;

        const scriptPath = path.join(__dirname, 'ds4_reader.py');
        const pythonExec = resolvePythonExec(node);

        function startProcess(selectedButtons, sleepTime) {
            const buttonConfig = selectedButtons || {};
            const sleep = sleepTime || 100;

            pythonProcess = startDs4Process({
                node,
                pythonExec,
                scriptPath,
                args: [sleep],
                onJson: (jsonData) => {
                    if (jsonData.status === 'disconnected') {
                        node.status({ fill: 'red', shape: 'ring', text: 'disconnected' });
                        return;
                    }
                    if (jsonData.status === 'connected') {
                        node.status({ fill: 'green', shape: 'dot', text: 'connected' });
                        return;
                    }

                    const filteredData = { buttons: {}, axes: {} };

                    if (jsonData.buttons) {
                        Object.keys(jsonData.buttons).forEach((key) => {
                            if (buttonConfig[key]) {
                                filteredData.buttons[key] = jsonData.buttons[key];
                            }
                        });
                    }

                    if (jsonData.axes) {
                        Object.keys(jsonData.axes).forEach((key) => {
                            if (buttonConfig[key]) {
                                filteredData.axes[key] = jsonData.axes[key];
                            }
                        });
                    }

                    if (Object.keys(filteredData.buttons).length === 0) {
                        delete filteredData.buttons;
                    }
                    if (Object.keys(filteredData.axes).length === 0) {
                        delete filteredData.axes;
                    }
                    
                    if (Object.keys(filteredData).length > 0) {
                        node.send({ payload: filteredData });
                        node.status({ fill: 'green', shape: 'dot', text: 'running' });
                    }
                },
                onExit: () => {
                    pythonProcess = null;
                }
            });
        }

        node.on('input', function(msg) {
            if (msg.kill === true) {
                if (pythonProcess) {
                    stopDs4Process(node, pythonProcess);
                    pythonProcess = null;
                }
                return;
            }
            if (!pythonProcess) {
                startProcess(config.selectedButtons, config.sleep);
            }
        });

        node.on('close', function(done) {
            if (pythonProcess) {
                stopDs4Process(node, pythonProcess, () => {
                    pythonProcess = null;
                    done();
                });
            } else {
                done();
            }
        });
    }

    RED.nodes.registerType("dualshock4_single", DualShock4SingleNode);
};
