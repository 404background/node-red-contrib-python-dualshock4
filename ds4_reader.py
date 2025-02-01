import pygame
import json
import sys
import time

sleep_time = float(sys.argv[1]) / 1000 if len(sys.argv) > 1 else 0.05
selected_inputs = json.loads(sys.argv[2]) if len(sys.argv) > 2 else []

pygame.init()
pygame.joystick.init()

joystick = None

while True:
    if joystick is None or not pygame.joystick.get_init():
        pygame.joystick.quit()
        pygame.joystick.init()

        if pygame.joystick.get_count() > 0:
            joystick = pygame.joystick.Joystick(0)
            joystick.init()
        else:
            print(json.dumps({"error": "No DualShock 4 controller found"}))
            sys.stdout.flush()
            time.sleep(1)
            continue

    pygame.event.pump()

    data = {}

    for i in range(joystick.get_numaxes()):
        axis_name = f"axis_{i}"
        if axis_name in selected_inputs:
            data[axis_name] = joystick.get_axis(i)

    for i in range(joystick.get_numbuttons()):
        button_name = f"button_{i}"
        if button_name in selected_inputs:
            data[button_name] = joystick.get_button(i)

    if data:
        print(json.dumps(data))
        sys.stdout.flush()

    time.sleep(sleep_time)
