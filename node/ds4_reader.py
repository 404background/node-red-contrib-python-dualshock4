import pygame
import json
import sys
import time

sleep_time = float(sys.argv[1]) / 1000 if len(sys.argv) > 1 else 0.05

DS4_BUTTON_MAP = {
    0: "cross", 1: "circle", 2: "square", 3: "triangle",
    9: "L1", 10: "R1", 4: "share", 6: "options",
    7: "L3", 8: "R3", 5: "ps", 15: "touchpad",
    11: "dpad_up", 14: "dpad_right", 12: "dpad_down", 13: "dpad_left"
}

DS4_AXIS_MAP = {
    0: "left_stick_x", 1: "left_stick_y",
    2: "right_stick_x", 3: "right_stick_y",
    4: "L2_trigger", 5: "R2_trigger"
}

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

    input_data = {
        "buttons": {},
        "axes": {}
    }

    for i in range(joystick.get_numbuttons()):
        button_name = DS4_BUTTON_MAP.get(i, f"button_{i}")
        input_data["buttons"][button_name] = joystick.get_button(i)

    for i in range(joystick.get_numaxes()):
        axis_name = DS4_AXIS_MAP.get(i, f"axis_{i}")
        input_data["axes"][axis_name] = round(joystick.get_axis(i), 3)

    print(json.dumps(input_data), flush=True)

    time.sleep(sleep_time)
