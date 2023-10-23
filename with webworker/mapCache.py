import requests
from time import sleep

delayed = {}
current = {}

def updateCache():
    r = requests.get("https://maps.rit.edu/proxySearch/densityMapDetail.php?mdo=1")
    if r.status_code == 200:
        delayed = current.copy()
        current = r.json()
    else:
        print("FUCK!", r.status_code)

while True:
    updateCache()
    sleep(60*5)
# Now we can get old data from the 'delayed' variable, data cached from 5 minutes ago