import requests
from time import sleep

saved = {}
new = {}

while True:
    diff = 0
    r = requests.get("https://maps.rit.edu/proxySearch/densityMap.php")
    if r.status_code == 200:
        locs = r.json()['busyness']
        for i in range(len(locs)):
            new[i] = locs[i]['properties']['count']
            try:
                diff += abs(new[i] - saved[i])
            except:
                pass
        print("Total diffs:", diff/2)
        saved = new.copy()
        sleep(60*5)
    else:
        print("FUCK!", r.status_code)

