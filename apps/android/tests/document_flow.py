"""Run on a fresh, disposable English Android emulator (selected through ANDROID_SERIAL)."""
import os
import re
import subprocess
import time
import xml.etree.ElementTree as ET
from uuid import uuid4

serial = os.environ["ANDROID_SERIAL"]
if not serial.startswith("emulator-"):
    raise SystemExit("Select a disposable emulator.")
package = "app.mdviewy.mobile"
filename = "mdviewy-" + uuid4().hex[:10] + ".md"

def adb(*args):
    return subprocess.check_output(["adb", "-s", serial, *args], text=True).strip()

def nodes():
    result = adb("shell", "uiautomator", "dump", "/data/local/tmp/mdviewy.xml")
    if "dumped to:" not in result:
        return []
    return ET.fromstring(adb("shell", "cat", "/data/local/tmp/mdviewy.xml")).findall(".//node")

def wait_for(predicate):
    for _ in range(8):
        tree = nodes()
        match = next((n for n in tree if predicate(n.attrib)), None)
        if match is not None:
            return match.attrib
        time.sleep(.2)
    labels = [n.get("text") or n.get("content-desc") for n in tree]
    raise AssertionError(f"Control missing. Screen: {labels}")

def tap(predicate):
    item = wait_for(predicate)
    x, y, right, bottom = map(int, re.findall(r"\d+", item["bounds"]))
    adb("shell", "input", "tap", str((x+right)//2), str((y+bottom)//2))

def label(text):
    return lambda n: (n["text"] or n["content-desc"]).casefold() == text.casefold()

def launch():
    adb("shell", "am", "start", "-n", package + "/.EditorActivity")

def replace(text):
    adb("shell", "input", "keycombination", "113", "29")
    adb("shell", "input", "text", text)


if __name__ == "__main__":
    launch()
    tap(label("More"))
    tap(label("New document"))
    tap(lambda n: n["class"] == "android.widget.EditText")
    adb("shell", "input", "text", "Original")
    tap(label("Save"))
    def picker_filename(n):
        return n["package"].endswith(".documentsui") and n["class"] == "android.widget.EditText"

    # The keyboard moves this field while DocumentsUI finishes opening.
    for _ in range(3):
        if wait_for(picker_filename)["focused"] == "true":
            break
        tap(picker_filename)
    wait_for(lambda n: picker_filename(n) and n["focused"] == "true")
    replace(filename)
    wait_for(lambda n: picker_filename(n) and n["text"] == filename)
    tap(lambda n: n["resource-id"].endswith(":id/button1") or n["text"] == "SAVE")
    wait_for(label("Open"))
    tap(lambda n: n["class"] == "android.widget.EditText")
    replace("Short")
    tap(label("Save"))
    tap(label("Read"))
    wait_for(label("Short"))
    tap(label("Edit"))
    tap(lambda n: n["class"] == "android.widget.EditText")
    replace("RecoveredDraft")
    wait_for(lambda n: n["class"] == "android.widget.EditText" and n["text"] == "RecoveredDraft")
    home = adb("shell", "cmd", "package", "resolve-activity", "--brief", "-a", "android.intent.action.MAIN",
               "-c", "android.intent.category.HOME").splitlines()[-1].split("/")[0]
    adb("shell", "input", "keyevent", "3")
    wait_for(lambda n: n["package"] == home)
    adb("shell", "am", "force-stop", package)
    launch()
    wait_for(lambda n: n["class"] == "android.widget.EditText" and n["text"] == "RecoveredDraft")
    tap(label("Open"))
    tap(label("Choose file"))
    tap(lambda n: n["text"] == filename)
    wait_for(label("Short"))
    print("PASS: Android file creation, shorter overwrite, rendered preview, draft recovery after process stop, and SAF reopen")
