import fastf1
import json

fastf1.Cache.enable_cache("./src/F1Cashe/data")
session = fastf1.get_session(2025, 24, "R")
session.load(telemetry=True, weather=False, messages=False)
lap = session.laps.pick_fastest()
tel = lap.get_telemetry()
print(tel.columns)
