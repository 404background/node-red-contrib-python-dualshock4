import os
os.environ['PYGAME_HIDE_SUPPORT_PROMPT'] = "hide"
import pygame
import json
import sys
import time

sleep_time = float(sys.argv[1]) / 1000 if len(sys.argv) > 1 else 0.05

# Correct mapping for DualShock 4
DS4_BUTTON_MAP = {
    0: "cross", 1: "circle", 2: "square", 3: "triangle",
    4: "share", 5: "ps", 6: "options",
    7: "L3", 8: "R3",
    9: "L1", 10: "R1",
    11: "dpad_up", 12: "dpad_down", 13: "dpad_left", 14: "dpad_right",
    15: "touchpad"
}

DS4_AXIS_MAP = {
    0: "left_stick_x", 1: "left_stick_y",
    2: "right_stick_x", 3: "right_stick_y",
    4: "L2_trigger", 5: "R2_trigger"
}

pygame.display.init()
pygame.joystick.init()

joystick = None

while True:
    # Check for controller connection
    if pygame.joystick.get_count() == 0:
        joystick = None
        print(json.dumps({"status": "disconnected"}), flush=True)
        pygame.joystick.quit()
        pygame.joystick.init()
        time.sleep(2)
        continue

    if joystick is None:
        try:
            joystick = pygame.joystick.Joystick(0)
            joystick.init()
            print(json.dumps({"status": "connected"}), flush=True)
        except pygame.error:
            joystick = None
            time.sleep(1)
            continue

    pygame.event.pump()

    input_data = {
        "buttons": {},
        "axes": {}
    }

    try:
        # Buttons
        for i in range(joystick.get_numbuttons()):
            if i in DS4_BUTTON_MAP:
                button_name = DS4_BUTTON_MAP[i]
                input_data["buttons"][button_name] = joystick.get_button(i)

        # Hats (D-Pad) - Override button mapping if hat is present
        if joystick.get_numhats() > 0:
            hat = joystick.get_hat(0)
            input_data["buttons"]["dpad_left"] = (1 if hat[0] == -1 else 0) | input_data["buttons"].get("dpad_left", 0)
            input_data["buttons"]["dpad_right"] = (1 if hat[0] == 1 else 0) | input_data["buttons"].get("dpad_right", 0)
            input_data["buttons"]["dpad_down"] = (1 if hat[1] == -1 else 0) | input_data["buttons"].get("dpad_down", 0)
            input_data["buttons"]["dpad_up"] = (1 if hat[1] == 1 else 0) | input_data["buttons"].get("dpad_up", 0)

        # Axes
        for i in range(joystick.get_numaxes()):
            if i in DS4_AXIS_MAP:
                axis_name = DS4_AXIS_MAP[i]
                input_data["axes"][axis_name] = round(joystick.get_axis(i), 3)

        print(json.dumps(input_data), flush=True)

    except pygame.error:
        joystick = None
        print(json.dumps({"status": "disconnected"}), flush=True)
        time.sleep(1)
        continue

    time.sleep(sleep_time)
