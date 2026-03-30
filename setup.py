import subprocess
import os
import json
import sys
from pathlib import Path

if len(sys.argv) < 2:
    print("Usage: python setup.py <venv_name>")
    sys.exit(1)

venvName = sys.argv[1]

absDir = os.path.dirname(os.path.abspath(__file__))

if Path(venvName).is_absolute():
    venvPath = venvName
else:
    venvPath = os.path.join(absDir, venvName)

if os.path.isdir(venvPath):
    print(f'{venvName} already exists.')
    # We should still update path.json even if venv exists, in case it was moved or path.json is missing
else:
    if os.name == 'nt':
        subprocess.run(['python', '-m', 'venv', venvPath], check=True)
        subprocess.run([os.path.join(venvPath, 'Scripts', 'python.exe'), '-m', 'pip', 'install', '--upgrade', 'pip'], check=True)
        subprocess.run([os.path.join(venvPath, 'Scripts', 'pip.exe'), 'install', 'pygame'], check=True)
    else:
        subprocess.run(['python3', '-m', 'venv', venvPath], check=True)
        subprocess.run([os.path.join(venvPath, 'bin', 'python'), '-m', 'pip', 'install', '--upgrade', 'pip'], check=True)
        subprocess.run([os.path.join(venvPath, 'bin', 'pip'), 'install', 'pygame'], check=True)

if os.name == 'nt':
    path_config = {
        'NODE_PYENV_PYTHON': os.path.join(venvPath, 'Scripts', 'python.exe'),
        'NODE_PYENV_PIP': os.path.join(venvPath, 'Scripts', 'pip.exe'),
        'NODE_PYENV_EXEC': os.path.join(venvPath, 'Scripts') + os.sep
    }
else:
    path_config = {
        'NODE_PYENV_PYTHON': os.path.join(venvPath, 'bin', 'python'),
        'NODE_PYENV_PIP': os.path.join(venvPath, 'bin', 'pip'),
        'NODE_PYENV_EXEC': os.path.join(venvPath, 'bin') + os.sep
    }

with open(os.path.join(venvPath, 'path.json'), 'w') as f:
    json.dump(path_config, f, indent=4)

