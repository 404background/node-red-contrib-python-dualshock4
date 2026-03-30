const path = require('path');
const { resolvePythonExec, startDs4Process, stopDs4Process } = require('./ds4_common');

module.exports = function(RED) {
    function DualShock4MultiNode(config) {
        RED.nodes.createNode(this, config);
        const node = this;
        let pythonProcess = null;

        const scriptPath = path.join(__dirname, 'ds4_reader.py');
        const pythonExec = resolvePythonExec(node);

        const ORDERED_KEYS = [
            "cross", "circle", "square", "triangle",
            "L1", "R1", "share", "options",
            "L3", "R3", "ps", "touchpad",
            "dpad_up", "dpad_right", "dpad_down", "dpad_left",
            "left_stick_x", "left_stick_y",
            "right_stick_x", "right_stick_y",
            "L2_trigger", "R2_trigger"
        ];

        function startProcess(sleepTime) {
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

                    const messages = new Array(22).fill(null);
                    let hasData = false;

                    ORDERED_KEYS.forEach((key, index) => {
                        let val = undefined;
                        if (jsonData.buttons && jsonData.buttons[key] !== undefined) {
                            val = jsonData.buttons[key];
                        } else if (jsonData.axes && jsonData.axes[key] !== undefined) {
                            val = jsonData.axes[key];
                        }

                        if (val !== undefined) {
                            messages[index] = { payload: val, ds4_name: key };
                            hasData = true;
                        }
                    });

                    if (hasData) {
                        node.send(messages);
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
            if (!pythonProcess) startProcess(config.sleep);
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

    RED.nodes.registerType("dualshock4_multi", DualShock4MultiNode);
};
