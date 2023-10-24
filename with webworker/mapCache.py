import requests
import threading
import flask
import json
from flask_cors import CORS

delayed = {}
current = {}

def updateCache():
    global delayed, current
    r = requests.get("https://maps.rit.edu/proxySearch/densityMapDetail.php?mdo=1")
    if r.status_code == 200:
        if current == {}:
            delayed = dataAdjustments(r.json())
        else:
            delayed = json.loads(json.dumps(current)) # deepcopy was returning a function for some reason
        current = dataAdjustments(r.json())
        print(delayed[2]['count'], current[2]['count'])
        return delayed, current
    else:
        print("FUCK!", r.status_code)

# Source for corrections: I made it up
corrections = {
    "Library_3rd_Floor": {"max_occ": 550},
    "Library_2nd_Floor": {"max_occ": 250},
    "Library_1st_Floor": {"max_occ": 350},
    "Library_4th_Floor": {"max_occ": 400},
    "Library_A_Level": {"max_occ": 300},
    "Ross_Hall": {"max_occ": 200},
    "Gordon_Field_House": {"max_occ": 750}
}
def dataAdjustments(data):
    for dp in data:
        if dp['location'] in corrections:
            for correction in corrections[dp['location']]:
                dp[correction] = corrections[dp['location']][correction]
    return data
    
def set_interval(func, sec):
    def func_wrapper():
        set_interval(func, sec)
        func()
    t = threading.Timer(sec, func_wrapper)
    t.start()
    return t

updateCache()
set_interval(updateCache, 60*5)

app = flask.Flask(__name__)
CORS(app) # Remove me for security reasons

@app.route("/cached")
def getCached():
    return json.dumps(delayed)

@app.route("/current")
def getLive():
    return json.dumps(current)

app.run()
# Now we can get old data from the 'delayed' variable, data cached from 5 minutes ago
